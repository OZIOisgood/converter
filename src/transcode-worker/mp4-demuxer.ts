import * as mp4box from 'mp4box';
import { DataStream, FtypBox, ISOFile, MoovBox, MP4ArrayBuffer, MP4InfoWithMoov, MP4Sample, TrakBox } from 'mp4box';

interface VideoMetadata {
  moovBox: MoovBox;
  isProgressive: boolean;
  ftyp?: FtypBox;
}

/**
 * One second in micro seconds.
 */
const SECOND_IN_MICROSECONDS = 1_000_000;

/**
 * Memory-efficient consumer to parse a video file to a {@link ISOFile}.
 */
class VideoFileConsumer {
  private _readBytes = 0;

  /**
   * Constructs a new {@link VideoFileConsumer}.
   *
   * @param videoFileReader A reader for the video file to parse.
   * @param isoFile The MP4/ISO parser.
   */
  public constructor(
    private readonly videoFileReader: ReadableStreamDefaultReader<Uint8Array>,
    private readonly isoFile: ISOFile
  ) {}

  /**
   * Reads the next chunk from the video file and passes it on to the {@link ISOFile}.
   */
  public async next(): Promise<boolean> {
    const videoFileChunk = await this.videoFileReader.read();
    if (videoFileChunk.done) {
      this.isoFile.flush();
      return false;
    }

    const buffer = videoFileChunk.value.buffer as MP4ArrayBuffer;
    buffer.fileStart = this._readBytes;

    this.isoFile.appendBuffer(buffer);

    this._readBytes += buffer.byteLength;
    return true;
  }

  /**
   * Returns the count of the already read bytes from the video file.
   */
  public get readBytes(): number {
    return this._readBytes;
  }
}

/**
 * Memory-efficient {@link ReadableStream} handler for {@link MP4Sample}s received from {@link ISOFile}.
 *
 * This implementation converts {@link MP4Sample}s to {@link EncodedVideoChunk}s or {@link EncodedAudioChunk}s, forwards them to the output stream and
 * frees the allocated memory for {@link MP4Sample}s immediately.
 */
class SampleHandler {
  /**
   * Constructs a {@link SampleHandler}.
   *
   * @param isoFile The MP4/ISO parser.
   * @param videoTrack The trak box of the video track from the MP4/ISO parser.
   * @param controller The controller of a {@link ReadableStream} to push processed samples to.
   */
  public constructor(
    private readonly isoFile: ISOFile,
    private readonly videoTrack: TrakBox,
    private readonly controller: ReadableStreamDefaultController<EncodedVideoChunk>
  ) {}

  /**
   * Processes received samples for a specific track.
   *
   * @param trackId The ID of the track the samples belong to.
   * @param samples The samples to process.
   */
  public handle(trackId: number, samples: MP4Sample[]): void {
    // Determine chunk type and its handling
    let encodedChunkConstructor: typeof EncodedVideoChunk;
    let mediaTrackBox: TrakBox;
    if (this.videoTrack.tkhd.track_id === trackId) {
      encodedChunkConstructor = EncodedVideoChunk;
      mediaTrackBox = this.videoTrack;
    } else {
      throw Error(`[Mp4Demuxer][SecondPass] Received samples for unexpected track ${trackId}`);
    }

    // Process all new samples
    for (const sample of samples) {
      const timestamp = (SECOND_IN_MICROSECONDS * sample.cts) / sample.timescale;

      // Append sample as encoded media chunk to result
      const encodedChunk = new encodedChunkConstructor({
        type: sample.is_sync ? 'key' : 'delta',
        timestamp,
        duration: (SECOND_IN_MICROSECONDS * sample.duration) / sample.timescale,
        data: sample.data
      });

      console.log(timestamp);

      // Release sample from memory immediately
      this.isoFile.releaseSample(mediaTrackBox, sample.number);

      // Output encoded chunk on stream
      this.controller.enqueue(encodedChunk);
    }
  }
}

/**
 * Demuxer for MP4/ISO files.
 *
 * The demuxer parses MP4/ISO files in a memory-efficient way, extracts samples from the first videotracks and makes them available as
 * {@link ReadableStream}.
 */
export class Mp4Demuxer {
  /**
   * Constructs a new {@link Mp4Demuxer}.
   *
   * @param videoMetadata The parsed metadata of the video file.
   * @param videoFile The video file to process.
   */
  public constructor(
    private readonly videoMetadata: VideoMetadata,
    private readonly videoFile: File
  ) {}

  /**
   * Initializes a {@link Mp4Demuxer} by extracting video metadata from the video file.
   *
   * @param videoFile The ISO/MP4 file to parse.
   */
  public static async create(videoFile: File): Promise<Mp4Demuxer> {
    const videoMetadata = await this.readMetadata(videoFile);

    return new Mp4Demuxer(videoMetadata, videoFile);
  }

  /**
   * Returns the ISO/MP4 metadata.
   */
  public getInfo(): MP4InfoWithMoov {
    const info = this.createIndexedIsoFile().getInfo();
    if (!info.hasMoov) {
      throw new Error('[Mp4Demuxer] MP4 does not contain metadata');
    }

    return info;
  }

  /**
   * Returns the binary track description from the video metadata.
   * This is required for video decoders to decode frames.
   *
   * @param trackId The id of the track to extract the description for.
   */
  public getTrackDescription(trackId: number): ArrayBuffer {
    const trakBox = this.getTrackById(trackId);
    const stsdEntries = trakBox.mdia.minf.stbl.stsd.entries;

    for (const stsdEntry of stsdEntries) {
      let codecBox;
      switch (stsdEntry.type) {
        case 'avc1':
          codecBox = stsdEntry.avcC;
          break;
        case 'hvc1':
          codecBox = stsdEntry.hvcC;
          break;
        case 'av01':
          codecBox = stsdEntry.av1C;
          break;
        case 'vp08':
          codecBox = stsdEntry.vpcC;
          break;
        case 'vp09':
          codecBox = stsdEntry.vpcC;
          break;
        case 'mp4a':
          codecBox = stsdEntry.esds;
          break;
        default:
          continue;
      }

      const descriptionStream = new DataStream(undefined, 0, DataStream.BIG_ENDIAN);
      codecBox.write(descriptionStream);

      return new Uint8Array(descriptionStream.buffer, 8);
    }

    throw new Error('[Mp4Demuxer] Failed to construct track description');
  }

  /**
   * Creates a stream of extracted samples which are extracted iteratively from the ISO/MP4 file.
   */
  public createStream(): ReadableStream<EncodedVideoChunk> {
    const isoFile = this.createIndexedIsoFile();

    // Get MP4 metadata from first pass
    const mp4Info = isoFile.getInfo();
    if (!mp4Info.hasMoov) {
      throw new Error('[Mp4Demuxer] MP4 does not contain metadata');
    }

    // Find video track to extract from ISO/MP4 file
    const videoTrack = mp4Info.videoTracks[0];
    if (videoTrack === undefined) {
      throw new Error('[Mp4Demuxer][SecondPass] No video tracks found');
    }

    // Mark video track for extraction
    isoFile.setExtractionOptions(videoTrack.id, null, { nbSamples: 20 });

    // Enable extraction of samples
    isoFile.start();

    let videoFileConsumer: VideoFileConsumer;
    let videoFileSize: number;
    let sentNewSamples = false;
    return new ReadableStream<EncodedVideoChunk>({
      // Initialize the ISO/MP4 parser
      start: (controller: ReadableStreamDefaultController<EncodedVideoChunk>): void => {
        videoFileSize = this.videoFile.size;
        videoFileConsumer = new VideoFileConsumer(this.videoFile.stream().getReader(), isoFile);

        // Register error handler for ISO/MP4 parsing
        isoFile.onError = (error): void => {
          controller.error(new Error(`[Mp4Demuxer][SecondPass] Failed to parse video file: ${error}`));
        };

        // Register handler for sample processing to enable extraction of samples
        const sampleHandler = new SampleHandler(isoFile, this.getTrackById(videoTrack.id), controller);
        isoFile.onSamples = (trackId, user, samples): void => {
          void user;

          sampleHandler.handle(trackId, samples);

          sentNewSamples = true;
        };
      },

      // Handle pull requests on the stream
      pull: async (controller: ReadableStreamDefaultController<EncodedVideoChunk>): Promise<void> => {
        // Read ISO/MP4 file lazily to keep only the required amount of data in-memory to keep the video decoder queue filled
        while (true) {
          const hasMore = await videoFileConsumer.next();
          if (!hasMore) {
            controller.close();
            break;
          }

          const readBytes = videoFileConsumer.readBytes;
          console.info(
            `[Mp4Demuxer][SecondPass] Processed ${(readBytes / 1024 / 1024).toFixed(2)}MB / ${(videoFileSize / 1024 / 1024).toFixed(
              2
            )}MB of video file`
          );

          // Keep consuming MP4/ISO file until new samples have been returned
          if (sentNewSamples) {
            sentNewSamples = false;
            break;
          }
        }
      }
    } satisfies UnderlyingDefaultSource<EncodedVideoChunk>);
  }

  /**
   * Executes the first pass to extract metadata from the ISO/MP4 file.
   *
   * @param videoFileHandle The ISO/MP4 file to parse.
   * @private
   */
  private static async readMetadata(videoFile: File): Promise<VideoMetadata> {
    // Initialize ISO/MP4 parser to discard everything but metadata to reduce memory consumption
    const isoFile = mp4box.createFile(false);

    isoFile.onError = (error): void => {
      console.error(`[Mp4Demuxer][FirstPass] Failed to parse video file: ${error}`);
    };

    // Read ISO/MP4 file completely to parse metadata
    const videoFileReader = videoFile.stream().getReader();
    const videoFileConsumer = new VideoFileConsumer(videoFileReader, isoFile);
    while (await videoFileConsumer.next()) {
      // TODO: Evaluate if we can break on moov found or if more data is needed
    }

    if (isoFile.moov === undefined) {
      throw new Error('[Mp4Demuxer] MP4 does not contain metadata');
    }

    return {
      moovBox: isoFile.moov,
      isProgressive: isoFile.isProgressive,
      ...(isoFile.ftyp !== undefined && { ftyp: isoFile.ftyp })
    };
  }

  private createIndexedIsoFile(): ISOFile {
    const isoFile = mp4box.createFile(false);
    isoFile.moov = this.videoMetadata.moovBox;
    isoFile.moovStartFound = true;
    isoFile.isProgressive = this.videoMetadata.isProgressive;

    if (this.videoMetadata.ftyp !== undefined) {
      isoFile.ftyp = this.videoMetadata.ftyp;
    }

    return isoFile;
  }

  private getTrackById(trackId: number): TrakBox {
    for (const trak of this.videoMetadata.moovBox.traks) {
      if (trak.tkhd.track_id === trackId) {
        return trak;
      }
    }

    throw new Error(`[Mp4Demuxer] Track with id ${trackId} is unknown`);
  }
}

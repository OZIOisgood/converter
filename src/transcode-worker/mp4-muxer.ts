import { StreamTarget, Muxer } from 'mp4-muxer';

/**
 * Base type for encoded video  samples and their associated metadata.
 */
export interface EncodedChunkData<TYPE extends string, CHUNK, METADATA> {
  type: TYPE;
  chunk: CHUNK;
  metadata?: METADATA;
}

/**
 * Encoded video sample with its associated metadata.
 */
export type EncodedVideoChunkData = EncodedChunkData<'video', EncodedVideoChunk, EncodedVideoChunkMetadata>;

/**
 * Extracted MuxerOptions type from mp4-muxer library because it is not exported.
 */
type MuxerOptions = ConstructorParameters<typeof Muxer>[0];

/**
 * Muxer for ISO/MP4 files.
 */
export class Mp4Muxer {
  /**
   * Constructs a new {@link Mp4Muxer}.
   *
   * @param outputFile The file to write the muxed output to.
   * @param muxerOptions The options for the muxer.
   */
  public constructor(
    private readonly outputFile: FileSystemSyncAccessHandle,
    private readonly muxerOptions: Pick<MuxerOptions, 'video' | 'audio' | 'fastStart'>
  ) {}

  /**
   * Creates a ISO/MP4 data sink for writing encoded video samples to.
   */
  public createStream(): WritableStream<EncodedVideoChunkData> {
    let muxer: Muxer<StreamTarget>;

    return new WritableStream<EncodedVideoChunkData>({
      // Initialize muxer
      start: (): void => {
        muxer = new Muxer({
          ...this.muxerOptions,
          target: new StreamTarget(
            (data, position) => {
              this.outputFile.write(data, { at: position });
            },
            () => {
              this.outputFile.flush();
              this.outputFile.close();
            }
          ),
          firstTimestampBehavior: 'offset'
        });
      },

      // Handle push requests on the stream
      write: (chunk: EncodedVideoChunkData, controller: WritableStreamDefaultController): void => {
        switch (chunk.type) {
          case 'video':
            muxer.addVideoChunk(chunk.chunk, chunk.metadata);
            break;
          default:
            controller.error(new Error(`Invalid chunk type:\n${JSON.stringify(chunk, null, 2)}`));
        }
      },

      // Finalize writing of ISO/MP4 file
      close: (): void => {
        console.info('[Mp4Muxer] Finalizing muxer');
        muxer.finalize();
      }
    } satisfies UnderlyingSink<EncodedVideoChunkData>);
  }
}

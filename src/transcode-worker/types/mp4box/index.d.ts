declare module 'mp4box' {
  declare interface MP4TrackReference {
    type: string;
    track_ids: number[];
  }

  declare interface MP4TrackKind {
    schemaURI: string;
    value: string;
  }

  declare interface MP4Track {
    /** Number, giving track identifier **/
    id: number;
    name?: string;
    references: MP4TrackReference[];
    edits?: IterableIterator<[unknown, unknown]>;
    /** Date object, indicating the creation date of the file as given in the track header **/
    created: Date;
    /** Date object, indicating the last modification date of the file as given in the track header **/
    modified: Date;
    movie_duration: number;
    movie_timescale?: number;
    /** Number, layer information as indicated in the track header **/
    layer: string;
    /** Number, identifier of the alternate group the track belongs to **/
    alternate_group: number;
    volume: number;
    matrix: unknown;
    /** Number, width of the track as indicated in the track header **/
    track_width: number;
    /** Number, height of the track as indicated in the track header **/
    track_height: number;
    /** Number, indicating the track timescale, as given in the track header **/
    timescale: number;
    cts_shift?: unknown;
    /** Number, providing the duration of the (unfragmented part of) track, in timescale units **/
    duration: number;
    samples_duration: number;
    /** String, giving the MIME codecs parameter for this track (e.g. “avc1.42c00d” or “mp4a.40.2”), to be used to create SourceBuffer objects with Media Source Extensions **/
    codec: string;
    kind: MP4TrackKind;
    /** String, giving the 3-letter language code **/
    language: string;
    /** Number, giving the number of track samples (i.e. frames) **/
    nb_samples: number;
    /** Number, providing the bitrate of the track in bits per second **/
    bitrate: number;
    type: string;
  }

  declare interface MP4AudioTrack extends MP4Track {
    type: 'audio';
    /** Object, information specific for audio tracks **/
    audio: {
      /** Number, sample rate as indicated in the media header **/
      sample_rate: number;
      /** Number, number of channels as indicated in the media header **/
      channel_count: number;
      /** Number, size in bits of an uncompressed audio sample as indicated in the media header **/
      sample_size: number;
    };
  }

  declare interface MP4VideoTrack extends MP4Track {
    type: 'video';
    /** Object, information specific for video tracks **/
    video: {
      /** Number, width of the video track as indicated in the media header **/
      width: number;
      /** Number, height of the video track as indicated in the media header **/
      height: number;
    };
  }

  declare interface MP4SubtitlesTrack extends MP4Track {
    type: 'subtitles';
  }

  declare interface MP4MetadataTrack extends MP4Track {
    type: 'metadata';
  }

  declare interface MP4Info {
    hasMoov: boolean;
    mime: string;
  }

  declare interface MP4InfoWithoutMoov extends MP4Info {
    hasMoov: false;
  }

  declare interface MP4InfoWithMoov extends MP4Info {
    hasMoov: true;
    /** Number, providing the duration of the movie (unfragmented part) in timescale units **/
    duration: number;
    /** Number, corresponding to the timescale as given in the movie header **/
    timescale: number;
    /** boolean, indicating if the file is already fragmented **/
    isFragmented: boolean;
    /** Number, giving the duration of the fragmented part of the file, in timescale units **/
    fragment_duration?: number;
    /** boolean, indicating if the file can be played progressively **/
    isProgressive: boolean;
    /** boolean, indicating if the file contains an MPEG-4 Initial Object Descriptor **/
    hasIOD: boolean;
    /** Array of 4CC codes corresponding to the file brands as given in the ftyp box **/
    brands: string[];
    /** Date object, indicating the creation date of the file as given in the movie header **/
    created: Date;
    /** Date object, indicating the last modification date of the file as given in the movie header **/
    modified: Date;
    /** Array of track information objects **/
    tracks: (MP4AudioTrack | MP4VideoTrack | MP4SubtitlesTrack | MP4MetadataTrack)[];
    audioTracks: MP4AudioTrack[];
    videoTracks: MP4VideoTrack[];
    subtitleTracks: MP4SubtitlesTrack[];
    metadataTracks: MP4MetadataTrack[];
    hintTracks: MP4MetadataTrack[];
    otherTracks: MP4MetadataTrack[];
  }

  declare interface MP4SegmentOptions {
    /**
     * Number, representing the number of frames per segment, i.e. the time between 2 callbacks to onSegment.
     * If not enough data is received to form a segment, received samples are kept.
     * If not provided, the default is 1000
     */
    nbSamples?: number;

    /**
     * boolean, indicating if segments should start with a RAP.
     * If not provided, the default is true.
     */
    rapAlignement?: boolean;
  }

  declare type MP4ArrayBuffer = ArrayBuffer & { fileStart: number };

  declare interface MP4Segment {
    /** Number, the track id **/
    id: number;

    /** Object, the caller of the segmentation for this track, as given in setSegmentOptions **/
    user: unknown;

    /** ArrayBuffer, the initialization segment for this track **/
    buffer: ArrayBuffer;

    /** umber, sample number of the last sample in the segment, plus 1 **/
    sampleNumber?: number;

    /** Boolean, indication if this is the last segment to be received **/
    last?: boolean;
  }

  declare interface MP4ExtractionOptions {
    /**
     * Number, representing the number of samples per callback call.
     * If not enough data is received to extract the number of samples, the samples received so far are kept.
     * If not provided, the default is 1000.
     */
    nbSamples?: number;

    /**
     * boolean, indicating if sample arrays should start with a RAP.
     * If not provided, the default is true.
     */
    rapAlignement?: boolean;
  }

  declare interface MP4Sample {
    track_id: number;
    number: number;
    number_in_traf: number;
    offset: number;
    description: unknown;
    is_rap: boolean;
    is_sync: boolean;
    is_leading: boolean;
    timescale: number;
    dts: number;
    cts: number;
    duration: number;
    size: number;
    data: ArrayBuffer;
  }

  declare class DataStream {
    public static BIG_ENDIAN = false;
    public static LITTLE_ENDIAN = true;

    /**
     * DataStream reads scalars, arrays and structs of data from an ArrayBuffer.
     * It's like a file-like DataView on steroids.
     *
     * @param arrayBuffer ArrayBuffer to read from.
     * @param byteOffset Offset from arrayBuffer beginning for the DataStream.
     * @param endianess ataStream.BIG_ENDIAN or DataStream.LITTLE_ENDIAN (the default).
     */
    public constructor(arrayBuffer?: ArrayBuffer, byteOffset?: number, endianess?: boolean);

    /**
     * Returns the byte length of the DataStream object.
     */
    public get byteLength(): number;

    /**
     * Get the backing ArrayBuffer of the DataStream object.
     */
    public get buffer(): ArrayBuffer;

    /**
     * Set the backing ArrayBuffer of the DataStream object.
     * The setter updates the DataView to point to the new buffer.
     *
     * @param buffer
     */
    public set buffer(buffer: ArrayBuffer): void;

    /**
     * Fet the byteOffset of the DataStream object.
     */
    public get byteOffset(): number;

    /**
     * Set the byteOffset of the DataStream object.
     * The setter updates the DataView to point to the new byteOffset.
     *
     * @param offset
     */
    public set byteOffset(offset: number): void;

    /**
     * Get the backing DataView of the DataStream object.
     */
    public get dataViesw(): DataView;

    /**
     * Set the backing DataView of the DataStream object.
     * The setter updates the buffer and byteOffset to point to the DataView values.
     * @param dataView
     */
    public set dataView(dataView: DataView): void;

    /**
     * Sets the DataStream read/write position to given position.
     * Clamps between 0 and DataStream length.
     *
     * @param pos
     */
    public seek(pos: number): void;

    /**
     * Returns true if the DataStream seek pointer is at the end of buffer and there's no more data to read.
     *
     * @return True if the seek pointer is at the end of the buffer.
     */
    public isEof(): boolean;
  }

  declare interface Box {
    type: string;
    size: number;
    uuid: unknown;
    boxes: unknown[];
    start: number;
    hdr_size: number;
    write: (stream: DataStream) => void;
  }

  declare interface MoovBox extends Box {
    type: 'moov';
    traks: TrakBox[];
  }

  declare interface AvccBox extends Box {
    type: 'avcC';
    configurationVersion: number;
    AVCProfileIndication: number;
    profile_compatibility: number;
    AVCLevelIndicator: number;
    lengthSizeMinusOne: number;
    nb_SPS_nalus: number;
    SPS: unknown[];
    nb_PPS_nalus: number;
    PPS: unknown[];
  }

  declare interface Avc1Box extends Box {
    type: 'avc1';
    data_reference_index: number;
    width: number;
    height: number;
    horizresolution: number;
    vertresolution: number;
    frame_count: number;
    compressorname: string;
    depth: number;
    avcC: AvccBox;
  }

  declare interface Hvc1Box extends Box {
    type: 'hvc1';
    hvcC: Box;
  }

  declare interface Vp08Box extends Box {
    type: 'vp08';
    vpcC: Box;
  }

  declare interface Vp09Box extends Box {
    type: 'vp09';
    vpcC: Box;
  }

  declare interface Av01Box extends Box {
    type: 'av01';
    av1C: Box;
  }

  declare interface Mp4aBox extends Box {
    type: 'mp4a';
    esds: Box;
  }

  declare interface StsdBox extends Box {
    type: 'stsd';
    flags: number;
    version: number;
    entries: (Box & (Avc1Box | Hvc1Box | Vp08Box | Vp09Box | Av01Box | Mp4aBox))[];
  }

  declare interface StblBox extends Box {
    type: 'stbl';
    subBoxNames: string[];
    sgpds: unknown[];
    sbgps: unknown[];
    stsd: StsdBox;
    stts: unknown;
    stss: unknown;
    ctts: unknown;
    stsc: unknown;
    stsz: unknown;
    stco: unknown;
  }

  declare interface MinfBox extends Box {
    type: 'minf';
    vmhd: unknown;
    hdlr: unknown;
    dinf: unknown;
    stbl: StblBox;
  }

  declare interface MdiaBox extends Box {
    type: 'mdia';
    mdhd: unknown;
    hdlr: unknown;
    minf: MinfBox;
  }

  declare interface TkhdBox extends Box {
    type: 'tkhd';
    version: number;
    creation_time: number;
    modification_time: number;
    track_id: number;
    duration: number;
    layer: number;
    alternate_group: number;
    volume: number;
    matrix: number[];
    width: number;
    height: number;
  }

  declare interface TrakBox extends Box {
    type: 'trak';
    tkhd: TkhdBox;
    edts: unknown;
    mdia: MdiaBox;
    samples: MP4Sample[];
    samples_duration: number;
    samples_size: number;
    sample_groups_info: unknown[];
  }

  declare interface FtypBox extends Box {
    type: 'ftyp';
    major_brand: string;
    minor_version: number;
    compatible_brands: string[];
  }

  declare interface MP4ExtractedTrack {
    id: number;
    user: unknown;
    trak: TrakBox & { readonly nextSample: number };
    nb_samples: number;
    samples: MP4Sample[];
  }

  declare interface ISOFile {
    /**
     * The onMoovStart callback is called when the ‘moov’ box is starting to be parsed.
     * Depending on the download speed, it may take a while to download the whole ‘moov’ box.
     * The end of parsing is signaled by the onReady callback.
     */
    onMoovStart: (() => void) | null;

    /**
     * The onReady callback is called when the the ‘moov’ box has been parsed, i.e. when the metadata about the file is parsed.
     */
    onReady: ((info: MP4InfoWithoutMoov | MP4InfoWithMoov) => void) | null;

    /**
     * Indicates that an error has occurred during the processing. e is a String.
     */
    onError: ((error: string) => void) | null;

    /**
     * Provides an ArrayBuffer to parse from.
     * The ArrayBuffer must have a fileStart (Number) property indicating the 0-based position of first byte of the ArrayBuffer in the original file.
     * Returns the offset (in the original file) that is expected to be the fileStart value of the next buffer.
     * This is particularly useful when the moov box is not at the beginning of the file.
     */
    appendBuffer: (data: MP4ArrayBuffer) => number;

    /**
     * Indicates that sample processing can start (segmentation or extraction).
     * Sample data already received will be processed and new buffer append operation will trigger sample processing as well.
     */
    start: () => void;

    /**
     * Indicates that sample processing is stopped.
     * Buffer append operations will not trigger calls to onSamples or onSegment.
     */
    stop: () => void;

    /**
     * Indicates that no more data will be received and that all remaining samples should be flushed in the segmentation or extraction process.
     */
    flush: () => void;

    /**
     * Indicates that the track with the given track_id should be segmented, with the given options.
     * When segments are ready, the callback onSegment is called with the user parameter
     *
     * @param track_id The track with the given track_id
     * @param user The callback onSegment is called with the user parameter
     * @param options The segment options to set
     */
    setSegmentOptions: (track_id: number, user: unknown, options?: MP4SegmentOptions) => void;

    /**
     * Indicates that the track with the given track_id should not be segmented
     *
     * @param track_id The track ID to not be segmented
     */
    unsetSegmentOptions: (track_id: number) => void;

    /**
     * Callback called when a segment is ready, according to the options passed in setSegmentOptions.
     * user is the caller of the segmentation, for this track, and buffer is an ArrayBuffer containing the Movie Fragments for this segment.
     */
    onSegment: ((id: number, user: unknown, buffer: ArrayBuffer, sampleNumber: number, last: boolean) => void) | null;

    /**
     * Indicates that the application is ready to receive segments
     */
    initializeSegmentation: () => MP4Segment[];

    /**
     * Indicates that the track with the given track_id for which samples should be extracted, with the given options.
     * When samples are ready, the callback onSamples is called with the user parameter
     *
     * @param track_id track_id for which samples should be extracted
     * @param user the callback onSamples is called with the user parameter
     * @param options the extraction options
     */
    setExtractionOptions: (track_id: number, user: unknown, options?: MP4ExtractionOptions) => void;

    /**
     * Indicates that the samples for the track with the given track_id should not be extracted
     *
     * @param track_id the track_id for which samples should not be extracted
     */
    unsetExtractionOptions: (track_id: number) => void;

    /**
     * Callback called when a set of samples is ready, according to the options passed in setExtractionOptions.
     * user is the caller of the segmentation, for this track, and samples is an Array of samples.
     */
    onSamples: ((id: number, user: unknown, samples: MP4Sample[]) => void) | null;

    /**
     * Indicates that the next samples to process (for extraction or segmentation) start at the given time (Number, in seconds) or at the time of the previous Random Access Point (if useRap is true, default is false).
     * Returns the offset in the file of the next bytes to be provided via appendBuffer .
     *
     * @param time
     * @param useRap
     */
    seek: (time: number, useRap?: boolean) => void;

    /**
     * Try to get sample data for a given sample
     *
     * @param trak the trak box to extract the sample from
     * @param sampleNum The number of the sample to extract
     *
     * @return the same sample if already requested; null if not found
     */
    getSample: (trak: TrakBox, sampleNum: number) => MP4Sample | null;

    /**
     * Releases the memory allocated for sample data for the given track id, up to (but excluding) the given sample number.
     *
     * @param id the track ID
     * @param sampleNumber
     */
    releaseUsedSamples: (id: number, sampleNumber: number) => void;

    /**
     * Release the memory used to store the data of the sample
     */
    releaseSample: (trak: TrakBox, sampleNum: number) => number;

    getTrackById: (id: number) => TrakBox | null;

    getInfo: () => MP4InfoWithoutMoov | MP4InfoWithMoov;

    /**
     * Array of Track objects for which extraction of samples is requested
     */
    readonly extractedTracks: readonly MP4ExtractedTrack[];

    moov: MoovBox | undefined;

    /**
     * Boolean indicating if the file is compatible with progressive parsing (moov first)
     */
    isProgressive: boolean;

    ftyp?: FtypBox;

    /**
     * Boolean used to fire moov start event only once
     */
    moovStartFound: boolean;
  }

  declare function createFile(keepMdatData: boolean = true): ISOFile;

  declare interface Log {
    debug: (module: string, msg: string) => void;
    log: (module: string, msg: string) => void;
    info: (module: string, msg: string) => void;
    warn: (module: string, msg: string) => void;
    error: (module: string, msg: string) => void;
    setLogLevel: (level: (module: string, msg: string) => void) => void;
  }

  declare const Log: Log;
}

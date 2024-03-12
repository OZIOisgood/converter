import { EncodedVideoChunkData } from './mp4-muxer';

/**
 * Options for the {@link VideoTranscoder}.
 */
export interface VideoTranscoderOptions {
  keyFrameIntervalSeconds: number;
  videoDecoderQueueLimit: number;
  videoDecoderConfig: VideoDecoderConfig;
  videoEncoderConfig: VideoEncoderConfig & Required<Pick<VideoEncoderConfig, 'framerate'>>;
}

/**
 * One second in micro seconds.
 */
const SECOND_IN_MICROSECONDS = 1_000_000;

/**
 * Handler for stream errors.
 */
class ErrorHandler {
  /**
   * Constructs a new {@link ErrorHandler}.
   *
   * @param streamController The controller of a {@link ReadableStream} to communicate the error to.
   */
  public constructor(private readonly streamController: TransformStreamDefaultController<EncodedVideoChunkData>) {}

  /**
   * Handles an error by forwarding it to a {@link ReadableStream} controller.
   *
   * @param error The error to forward.
   */
  public handle(error: DOMException): void {
    this.streamController.error(new Error('[VideoTranscoder] Failed to encode video', { cause: error }));
  }
}

/**
 * Handler for encoded video frames from a {@link VideoEncoder}.
 */
class VideoEncoderOutputHandler {
  /**
   * Constructs a new {@link VideoEncoderOutputHandler}.
   *
   * @param streamController The controller of a {@link ReadableStream} to push processed samples to.
   */
  public constructor(private readonly streamController: TransformStreamDefaultController<EncodedVideoChunkData>) {}

  /**
   * Processes encoded video chunks by forwarding them to the output stream.
   *
   * @param chunk The encoded video chunk to forward.
   * @param metadata The metadata of an encoded video chunk to forward.
   */
  public handle(chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata): void {
    try {
      this.streamController.enqueue({
        type: 'video',
        chunk: chunk,
        ...(metadata !== undefined && { metadata: metadata })
      });
    } catch (error) {
      console.error('[VideoTranscoder][VideoEncoderOutputHandler] Failed to enqueue encoded video chunk');
      console.error(error);
    }
  }
}

/**
 * Handler for decoded video frames from a {@link VideoDecoder}.
 *
 * This implementation handles frame rate-limiting before forwarding frames to a {@link VideoEncoder}.
 */
class VideoDecoderOutputHandler {
  private videoFrameCount: number = 0;
  private lastFrameStartMicroSeconds: number | null = null;
  private firstDroppedFrameStartMicroSeconds: number | null = null;

  /**
   * Constructs a new {@VideoDecoderOutputHandler}.
   *
   * @param minMicroSecondsBetweenFrames The minimal amount of microseconds between frames for frame rate-limiting.
   * @param framesBetweenKeyFrames The interval after which a new key frame shall be generated.
   * @param videoEncoder The video encoder to pass frames on to.
   */
  public constructor(
    private readonly minMicroSecondsBetweenFrames: number,
    private readonly framesBetweenKeyFrames: number,
    private readonly videoEncoder: VideoEncoder
  ) {}

  /**
   * Processes received video frames by applying rate-limiting and forwarding them to a {@link VideoEncoder}.
   *
   * @param frame
   */
  public handle(frame: VideoFrame): void {
    // Drop rate-limited frames
    if (this.lastFrameStartMicroSeconds !== null && frame.timestamp - this.lastFrameStartMicroSeconds <= this.minMicroSecondsBetweenFrames) {
      // Remember only start time of first dropped frame
      if (this.firstDroppedFrameStartMicroSeconds === null) {
        this.firstDroppedFrameStartMicroSeconds = frame.timestamp;
      }

      frame.close();
      return;
    }

    // Remember start time of frame for frame rate-limiting
    this.lastFrameStartMicroSeconds = frame.timestamp;

    let effectiveFrame: VideoFrame;
    if (this.firstDroppedFrameStartMicroSeconds !== null) {
      // Adjust start of current frame to start of first dropped frame
      // TODO: This is an oversimplified method to reduce the frame rate.
      //   A better algorithm would be to buffer the latest frame before encoding it and dividing the duration of the dropped frame(s) between the buffered frame
      //   and the next non-dropped frame to achieve a more fluent video stream and a more consistent frame rate.
      effectiveFrame = new VideoFrame(frame, {
        timestamp: this.firstDroppedFrameStartMicroSeconds,
        duration: frame.timestamp + (frame.duration ?? 0) - this.firstDroppedFrameStartMicroSeconds
      });

      // Close original frame to free up video decoder queue and resources
      frame.close();

      this.firstDroppedFrameStartMicroSeconds = null;
    } else {
      // Use received frame as-is
      effectiveFrame = frame;
    }

    // Ensure key frames are generated regularly to make video seekable
    this.videoEncoder.encode(effectiveFrame, { keyFrame: this.videoFrameCount % this.framesBetweenKeyFrames === 0 });
    effectiveFrame.close();

    this.videoFrameCount++;
  }
}

/**
 * Transcoder for video samples.
 */
export class VideoTranscoder {
  private readonly videoDecoderConfig: VideoDecoderConfig;
  private readonly videoEncoderConfig: VideoEncoderConfig;
  private readonly minMicroSecondsBetweenFrames: number;
  private readonly framesBetweenKeyFrames: number;
  private readonly videoDecoderQueueLimit: number;

  /**
   * Constructs a new {@link VideoTranscoder}.
   *
   * @param options The options for the transcoder.
   */
  public constructor(options: VideoTranscoderOptions) {
    this.videoDecoderConfig = options.videoDecoderConfig;
    this.videoEncoderConfig = options.videoEncoderConfig;

    const videoEncoderConfig = options.videoEncoderConfig;
    console.info(`Video encoder config:\n${JSON.stringify(videoEncoderConfig, null, 2)}`);

    // Determine max frame rate for rate-limiting
    const frameRateLimit = videoEncoderConfig.framerate;
    this.minMicroSecondsBetweenFrames = SECOND_IN_MICROSECONDS / frameRateLimit;

    // Determine how many frames shall be between key frames
    this.framesBetweenKeyFrames = Math.floor(frameRateLimit * options.keyFrameIntervalSeconds);

    // Set queue size limit of video decoder for back pressure
    this.videoDecoderQueueLimit = options.videoDecoderQueueLimit;
  }

  /**
   * Creates a stream to transcode video samples.
   */
  public createStream(): TransformStream<EncodedVideoChunk, EncodedVideoChunkData> {
    let videoDecoder: VideoDecoder;
    let videoEncoder: VideoEncoder;

    return new TransformStream<EncodedVideoChunk, EncodedVideoChunkData>({
      // Construct the transcoder pipelines
      start: (controller: TransformStreamDefaultController<EncodedVideoChunkData>): void => {
        const errorHandler = new ErrorHandler(controller);

        // Configure video encoder with user-provided configuration and passing of encoded video chunks to the output stream
        const videoEncoderOutputHandler = new VideoEncoderOutputHandler(controller);

        videoEncoder = new VideoEncoder({
          error: errorHandler.handle.bind(errorHandler),
          output: videoEncoderOutputHandler.handle.bind(videoEncoderOutputHandler)
        });
        videoEncoder.configure(this.videoEncoderConfig);

        // Configure video decoder with user-provided configuration and passing of decoded video frames to the video encoder
        const videoDecoderOutputHandler = new VideoDecoderOutputHandler(this.minMicroSecondsBetweenFrames, this.framesBetweenKeyFrames, videoEncoder);

        videoDecoder = new VideoDecoder({
          error: errorHandler.handle.bind(errorHandler),
          output: videoDecoderOutputHandler.handle.bind(videoDecoderOutputHandler)
        });
        videoDecoder.configure(this.videoDecoderConfig);
      },

      // Handle pushed video samples on the stream
      transform: (chunk: EncodedVideoChunk): void | Promise<void> => {
        // Enqueue chunk for decoding if decoder queue is not filled
        if (videoDecoder.decodeQueueSize < this.videoDecoderQueueLimit) {
          videoDecoder.decode(chunk);
          return;
        }

        // Apply back pressure until decoder queue size falls within the limit
        return new Promise((resolve): void => {
          videoDecoder.addEventListener(
            'dequeue',
            (): void => {
              // Wait for decoder queue to be below the limit before enqueuing new chunk for decoding
              if (videoDecoder.decodeQueueSize < this.videoDecoderQueueLimit) {
                videoDecoder.ondequeue = null;
                videoDecoder.decode(chunk);
                resolve();
              }
            },
            { capture: true, once: true }
          );
        });
      },

      // Complete pending transcoding events
      flush: async (): Promise<void> => {
        console.info('[VideoTranscoder] Flushing video decoder');
        await videoDecoder.flush();
        videoDecoder.close();

        console.info('[VideoTranscoder] Flushing video encoder');
        await videoEncoder.flush();
        videoEncoder.close();
      }
    } satisfies Transformer<EncodedVideoChunk, EncodedVideoChunkData>);
  }
}

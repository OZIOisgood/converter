import { MP4AudioTrack, MP4VideoTrack } from 'mp4box';
import { Mp4Demuxer } from './mp4-demuxer';
import { Mp4Muxer } from './mp4-muxer';
import { merge, split, tap } from './stream.utils';
import {
  TranscodeErrorResponseMessage,
  TranscodeProgressResponseMessage,
  TranscodeStartRequestMessage,
  TranscodeSuccessResponseMessage,
  TranscodeWorkerRequest
} from './types/transcode-worker-api';
import { VideoTranscoder } from './video-transcoder';

type TranscodeVideoOptionsQuality = Pick<VideoEncoderConfig, 'codec' | 'avc' | 'bitrate' | 'bitrateMode' | 'hardwareAcceleration'>;
type TranscodeVideoOptionsFramerate = Required<Pick<VideoEncoderConfig, 'framerate'>>;
interface TranscodeVideoOptionsRest {
  maxResolution: number;
  keyFrameIntervalSeconds: number;
}
type TranscodeVideoOptions = TranscodeVideoOptionsQuality & TranscodeVideoOptionsFramerate & TranscodeVideoOptionsRest;

interface TranscodeOptions {
  videoEncoder: TranscodeVideoOptions;
}

function calculateEncodedVideoSize(maxResolution: number, mp4VideoTrack: MP4VideoTrack): { height: number; width: number } {
  let encodedVideoWidth: number;
  let encodedVideoHeight: number;
  if (mp4VideoTrack.video.width > mp4VideoTrack.video.height) {
    // Horizontal video
    const videoDimensionRatio = mp4VideoTrack.video.height / mp4VideoTrack.video.width;

    encodedVideoWidth = Math.min(maxResolution, mp4VideoTrack.video.width);

    // H.264 only supports even sized frames
    const encodedVideoHeightRaw = encodedVideoWidth * videoDimensionRatio;
    encodedVideoHeight = Math.floor(encodedVideoHeightRaw) % 2 === 0 ? Math.floor(encodedVideoHeightRaw) : Math.ceil(encodedVideoHeightRaw);
  } else {
    // Vertical video
    const videoDimensionRatio = mp4VideoTrack.video.width / mp4VideoTrack.video.height;

    encodedVideoHeight = Math.min(maxResolution, mp4VideoTrack.video.height);

    // H.264 only supports even sized frames
    const encodedVideoWidthRaw = encodedVideoHeight * videoDimensionRatio;
    encodedVideoWidth = Math.floor(encodedVideoWidthRaw) % 2 === 0 ? Math.floor(encodedVideoWidthRaw) : Math.ceil(encodedVideoWidthRaw);
  }

  return {
    height: encodedVideoHeight,
    width: encodedVideoWidth
  };
}

/**
 * Starts the transcoding of a video file
 *
 * @param message The received start message with user-provided transcoding settings.
 */
async function startTranscodeStream(message: TranscodeStartRequestMessage): Promise<void> {
  const transcodeStartMark = performance.mark('transcode-start');

  // TODO: Shall be provided via parameter
  const transcodeOptions: TranscodeOptions = {
    videoEncoder: {
      // https://developer.mozilla.org/en-US/docs/Web/Media/Formats/codecs_parameter#avc1.ppccll
      codec: 'avc1.64002a',
      avc: {
        format: 'avc'
      },
      bitrate: 4_000_000,
      bitrateMode: 'variable',
      framerate: 30,
      hardwareAcceleration: 'prefer-hardware',
      maxResolution: 1280,
      keyFrameIntervalSeconds: 2
    }
  };

  postMessage({
    type: 'transcode-progress',
    correlationId: message.correlationId,
    stage: 'init'
  } satisfies TranscodeProgressResponseMessage);

  // Initialize MP4 demuxer
  const mp4Demuxer = await Mp4Demuxer.create(message.videoFile);

  const mp4Info = mp4Demuxer.getInfo();
  const mp4VideoTrack = mp4Info.videoTracks[0];
  let mp4AudioTrack = mp4Info.audioTracks[0];

  if (mp4VideoTrack === undefined) {
    throw new Error('[TranscodeWorker] MP4 does not contain any video tracks');
  }
  if (mp4AudioTrack === undefined) {
    mp4AudioTrack = {
      audio: {
        sample_rate: 0,
        channel_count: 0,
        sample_size: 0
      },
      nb_samples: 0
    } as MP4AudioTrack;
  }

  const videoEncoderOptions = transcodeOptions.videoEncoder;
  const { height: encodedVideoHeight, width: encodedVideoWidth } = calculateEncodedVideoSize(videoEncoderOptions.maxResolution, mp4VideoTrack);

  // Initialize video transcoder
  const videoTranscoder = new VideoTranscoder({
    keyFrameIntervalSeconds: videoEncoderOptions.keyFrameIntervalSeconds,
    videoDecoderQueueLimit: 300,
    videoDecoderConfig: {
      codec: mp4VideoTrack.codec.startsWith('vp08') ? 'vp8' : mp4VideoTrack.codec, // https://www.w3.org/TR/webcodecs-codec-registry/#video-codec-registry
      codedWidth: mp4VideoTrack.video.width,
      codedHeight: mp4VideoTrack.video.height,
      description: mp4Demuxer.getTrackDescription(mp4VideoTrack.id),
      hardwareAcceleration: 'prefer-hardware'
    },
    videoEncoderConfig: {
      ...videoEncoderOptions,
      height: encodedVideoHeight,
      width: encodedVideoWidth,
      bitrate: videoEncoderOptions.bitrate === undefined ? mp4VideoTrack.bitrate : Math.min(videoEncoderOptions.bitrate, mp4VideoTrack.bitrate),
      latencyMode: 'quality'
    }
  });

  // Initialize MP4 muxer
  // Allocate file in OPFS to write transcoded video file to (https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
  const storageRoot = await navigator.storage.getDirectory();
  const transcodedVideoFileHandle = await storageRoot.getFileHandle(message.correlationId, { create: true });
  const transcodedVideoFileSyncAccessHandle = await transcodedVideoFileHandle.createSyncAccessHandle();

  const mp4Muxer = new Mp4Muxer(transcodedVideoFileSyncAccessHandle, {
    video: {
      codec: 'avc',
      height: encodedVideoHeight,
      width: encodedVideoWidth
    },
    audio: undefined,
    fastStart: {
      expectedVideoChunks: Math.ceil(videoEncoderOptions.framerate * (mp4VideoTrack.samples_duration / mp4VideoTrack.timescale)),
      expectedAudioChunks: 0
    }
  });

  postMessage({
    type: 'transcode-progress',
    correlationId: message.correlationId,
    stage: 'transcode'
  } satisfies TranscodeProgressResponseMessage);

  // Start transcoding flow
  /**
   *                     /-> VideoTranscoder ->\
   * Flow: Mp4Demuxer ->                         -> Mp4Muxer
   */
  const videoTranscoderStream = videoTranscoder.createStream();

  const totalChunkCount = mp4VideoTrack.nb_samples;
  let processedChunkCount = 0;
  const mp4DemuxerOutputCompletion = mp4Demuxer
    .createStream()
    .pipeThrough(
      tap(() => {
        processedChunkCount++;

        // Send progress updates to UI
        postMessage({
          type: 'transcode-progress',
          correlationId: message.correlationId,
          stage: 'transcode',
          total: totalChunkCount,
          current: processedChunkCount
        } satisfies TranscodeProgressResponseMessage);
      })
    )
    .pipeTo(split({ stream: videoTranscoderStream.writable, accept: (chunk): chunk is EncodedVideoChunk => chunk instanceof EncodedVideoChunk }));

  const mp4MuxerInputCompletion = merge(videoTranscoderStream.readable).pipeTo(mp4Muxer.createStream());

  // Wait for completion of transcoding flow
  console.info('Waiting for MP4 demuxer to finish');
  await mp4DemuxerOutputCompletion;
  console.info('Waiting for MP4 muxer to finish');
  await mp4MuxerInputCompletion;

  const transcodeEndMark = performance.mark('transcode-end');
  const transcodeMeasure = performance.measure('transcode-duration', transcodeStartMark.name, transcodeEndMark.name);

  const file = await transcodedVideoFileHandle.getFile();

  // Propagate successfully transcoded video file to UI
  postMessage({
    type: 'transcode-success',
    correlationId: message.correlationId,
    file
  } satisfies TranscodeSuccessResponseMessage);

  console.info(
    `[TranscodeWorker] Finished transcoding ${((await transcodedVideoFileHandle.getFile()).size / 1024 / 1024).toFixed(2)}MB in ${(
      transcodeMeasure.duration / 1000
    ).toFixed(2)}s`
  );
}

/**
 * Handles errors by propagating them to the client.
 *
 * @param message The error message.
 * @param error The error cause.
 * @param request The associated request from the client.
 */
function handleError(message: string, error: unknown, request: TranscodeWorkerRequest): void {
  const fullMessage = `[ERROR][TranscodeWorker] ${message}`;

  console.error(fullMessage);
  console.log(error);

  postMessage({
    type: 'transcode-error',
    correlationId: request.correlationId,
    message: fullMessage,
    error: error
  } satisfies TranscodeErrorResponseMessage);
}

/**
 * Initialize web worker
 */
self.addEventListener('message', (event: MessageEvent<TranscodeWorkerRequest>) => {
  const data = event.data;

  switch (data.action) {
    case 'transcode-start':
      startTranscodeStream(data).catch(error => {
        handleError('Transcoding failed', error, data);
      });
      break;
    default:
      throw Error(`Invalid action in worker message:\n${JSON.stringify(data)}`);
  }
});

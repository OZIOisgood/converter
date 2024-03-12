/**
 * Base type for messages between worker and client.
 */
interface TranscodeMessage {
  correlationId: string;
}

/**
 * Base type for request messages from a client to the worker.
 */
interface TranscodeRequestMessage<ACTION extends string> extends TranscodeMessage {
  action: ACTION;
}

/**
 * Base type for response messages from the worker to a client.
 */
interface TranscodeResponseMessage<TYPE extends string> extends TranscodeMessage {
  type: TYPE;
}

/**
 * Client request message to start transcoding a video file.
 */
export interface TranscodeStartRequestMessage extends TranscodeRequestMessage<'transcode-start'> {
  videoFile: File;
}

/**
 * Worker response message to signal the success of a transcoding operation.
 */
export interface TranscodeSuccessResponseMessage extends TranscodeResponseMessage<'transcode-success'> {
  file: File;
}

/**
 * Worker response message to signal the progress of a transcoding operation.
 */
export interface TranscodeProgressResponseMessage extends TranscodeResponseMessage<'transcode-progress'> {
  stage: 'init' | 'transcode';
  total?: number;
  current?: number;
}

/**
 * Worker response message to signal the failure of a transcoding operation.
 */
export interface TranscodeErrorResponseMessage extends TranscodeResponseMessage<'transcode-error'> {
  message: string;
  error?: unknown;
}

/**
 * Full set of available client request messages which can be sent to the worker.
 */
export type TranscodeWorkerRequest = TranscodeStartRequestMessage;

/**
 * Full set of available worker response messages which can be sent to a client.
 */
export type TranscodeWorkerResponse = TranscodeSuccessResponseMessage | TranscodeProgressResponseMessage | TranscodeErrorResponseMessage;

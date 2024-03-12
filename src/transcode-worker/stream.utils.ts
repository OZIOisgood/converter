/**
 * Merges two streams into a single one.
 *
 * @param stream1 The first stream to merge.
 */
export function merge<INPUT1>(stream1: ReadableStream<INPUT1>): ReadableStream<INPUT1> {
  let stream1Reader: ReadableStreamDefaultReader<INPUT1>;

  let stream1Opened: boolean = true;

  let stream1Done: () => void;
  const allStreamsDone = Promise.all([
    new Promise<void>(resolve => {
      stream1Done = resolve;
    })
  ]);

  let cancelled = false;

  return new ReadableStream<INPUT1>({
    start: (controller: ReadableStreamDefaultController<INPUT1>): void => {
      // Close this stream as soon as all underlying streams are closed
      void allStreamsDone.then(() => {
        if (!cancelled) {
          controller.close();
        }
      });

      stream1Reader = stream1.getReader();
    },

    pull: (controller: ReadableStreamDefaultController<INPUT1>): Promise<void> => {
      const streamResults: Promise<void>[] = [];

      if (stream1Opened) {
        const stream1Result = stream1Reader.read().then((result): void => {
          if (result.done) {
            stream1Opened = false;
            stream1Done();
            return;
          }

          controller.enqueue(result.value);
        });

        streamResults.push(stream1Result);
      }

      return Promise.race(streamResults);
    },

    cancel: async (reason?: unknown): Promise<void> => {
      cancelled = true;

      const stream1Cancelled = stream1Reader.cancel(reason);

      await Promise.all([stream1Cancelled]);
    }
  } satisfies UnderlyingDefaultSource<INPUT1>);
}

/**
 * A stream with an associtated router function which specifies if a chunk shall be routed to this stream.
 */
export interface StreamRouter<T> {
  stream: WritableStream<T>;
  accept: (chunk: unknown) => chunk is T;
}

/**
 * Creates a stream which routes incoming chunks to different streams.
 *
 * @param stream1Router The first stream to route incoming chunks to.
 */
export function split<OUTPUT1>(stream1Router: StreamRouter<OUTPUT1>): WritableStream<OUTPUT1> {
  let stream1Writer: WritableStreamDefaultWriter<OUTPUT1>;

  return new WritableStream<OUTPUT1>({
    start: (): void => {
      stream1Writer = stream1Router.stream.getWriter();
    },

    write: (chunk: OUTPUT1): Promise<void> => {
      if (stream1Router.accept(chunk)) {
        return stream1Writer.write(chunk);
      }

      return Promise.reject(new Error(`Cannot route chunk to any stream:\n${JSON.stringify(chunk, null, 2)}`));
    },

    abort: async (reason?: unknown): Promise<void> => {
      const stream1Aborted = stream1Writer.abort(reason);

      await Promise.all([stream1Aborted]);
    },

    close: async (): Promise<void> => {
      const stream1Closed = stream1Writer.close();

      await Promise.all([stream1Closed]);
    }
  } satisfies UnderlyingSink<OUTPUT1>);
}

/**
 * Creates a stream with an associated mapper function to convert incoming data before passing them on.
 *
 * @param mapper The mapper function to use for conversion.
 */
export function map<I, O>(mapper: (input: I) => O): TransformStream<I, O> {
  return new TransformStream<I, O>({
    transform: (chunk: I, controller: TransformStreamDefaultController<O>): void => {
      controller.enqueue(mapper(chunk));
    }
  } satisfies Transformer<I, O>);
}

/**
 * Creates a stream which executes a given function before forwarding the chunk.
 *
 * @param executor The function to execute.
 */
export function tap<I>(executor: (input: I) => void): TransformStream<I, I> {
  return map(input => {
    executor(input);
    return input;
  });
}

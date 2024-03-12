import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { FileSaverModule, FileSaverService } from 'ngx-filesaver';
import { Subject } from 'rxjs';
import { version } from '../../package.json';
import { EpuiButtonModule } from '../epui/components/button/button.module';
import { EpuiContainerModule } from '../epui/components/container/container.module';
import { EpuiFileSelectCardModule } from '../epui/components/file-select-card/file-select-card.module';
import { EpuiProgressCardModule } from '../epui/components/progress-card/progress-card.module';
import { EpuiTypographyModule } from '../epui/components/typography/typography.module';
import { TranscodeStartRequestMessage, TranscodeWorkerResponse } from '../transcode-worker/types/transcode-worker-api';

const TranscodeWorker = new Worker(new URL('../transcode-worker/transcode.worker.ts', import.meta.url), { type: 'module' });

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    EpuiButtonModule,
    EpuiContainerModule,
    EpuiTypographyModule,
    EpuiFileSelectCardModule,
    EpuiProgressCardModule,
    HttpClientModule,
    FileSaverModule
  ],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  public readonly title = 'converter';
  protected readonly version = version;
  protected stage: 'select-file' | 'converting' | 'converted' = 'select-file';
  protected originalVideoFile: File | undefined;
  protected convertedVideoFile: File | undefined;

  protected readonly transcodeStatus$: Subject<TranscodeWorkerResponse> = new Subject<TranscodeWorkerResponse>();
  protected progress = -1;
  protected safeUrl: SafeUrl = '';

  public constructor(
    protected readonly sanitizer: DomSanitizer,
    protected readonly cdr: ChangeDetectorRef,
    protected readonly fileSaverService: FileSaverService
  ) {}

  public ngOnInit(): void {
    function stringifyError(error: unknown): string {
      if (error instanceof Error) {
        return JSON.stringify(
          {
            message: error.message,
            name: error.name,
            stack: error.stack
          },
          null,
          2
        );
      }
      return JSON.stringify(error);
    }

    function formatMessages(msgs: unknown[]): string {
      return msgs.map(msg => (typeof msg === 'string' ? msg : stringifyError(msg))).join('<br/>');
    }

    const formerObj = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info
    };

    function getLogger(className: string, former: (...data: unknown[]) => void): (...msgs: unknown[]) => void {
      return (...msgs: unknown[]): void => {
        former(...msgs);

        const div = document.createElement('div');
        div.className = className;
        const innerText = formatMessages(msgs);
        div.innerHTML = innerText;

        document.getElementById('mylog')?.appendChild(div);
      };
    }

    console.log = getLogger('text-base', formerObj.log);
    console.error = getLogger('text-base text-accent-darker', formerObj.error);
    console.warn = getLogger('text-base text-amber-700', formerObj.warn);
    console.info = getLogger('text-base text-blue-700', formerObj.info);

    window.onerror = (message, url, linenumber): void => {
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-base-to-string
      console.log('JavaScript error: ' + message + ' on line ' + linenumber + ' for ' + url);
    };
  }

  protected onFileSelected(videoFile: File): void {
    this.originalVideoFile = videoFile;
    this.stage = 'converting';

    // Generate an id for correlation of worker messages to the current encoding process
    const correlationId = crypto.randomUUID();

    // Subscribe to transcode status on worker
    TranscodeWorker.onmessage = (message: MessageEvent<TranscodeWorkerResponse>): void => {
      const workerResponse = message.data;

      switch (workerResponse.type) {
        case 'transcode-progress': {
          if (workerResponse.current !== undefined && workerResponse.total !== undefined) {
            this.progress = Math.round((workerResponse.current / workerResponse.total) * 100);
            this.cdr.detectChanges();
          }

          this.transcodeStatus$.next(workerResponse);
          break;
        }
        case 'transcode-success': {
          this.transcodeStatus$.next(workerResponse);
          this.stage = 'converted';

          // Create a blob url for the transcoded video file
          this.createFileBlobUrl(workerResponse.file);

          // detect changes to update UI
          this.cdr.detectChanges();
          break;
        }
        case 'transcode-error': {
          this.transcodeStatus$.next(workerResponse);
          console.error('Worker failed to transcode:', workerResponse.message, workerResponse.error);
          break;
        }
        default: {
          throw new Error('Unsupported transcode worker response:');
        }
      }
    };

    // Start transcoding in worker
    TranscodeWorker.postMessage({
      correlationId,
      action: 'transcode-start',
      videoFile
    } as TranscodeStartRequestMessage);
  }

  protected createFileBlobUrl(file: File): void {
    // Save transcoded video file from OPFS to user-provided save location
    this.convertedVideoFile = file;
    this.safeUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(this.convertedVideoFile));
    this.cdr.detectChanges();
  }

  protected onSaveFileClicked(): void {
    if (this.convertedVideoFile) {
      const blob = new Blob([this.convertedVideoFile], { type: 'video/mp4' });
      this.fileSaverService.save(blob, this.convertedVideoFile.name);
    }
  }
}

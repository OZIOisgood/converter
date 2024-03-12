import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'epui-file-select-card',
  templateUrl: './file-select-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileSelectCardComponent {
  @Input() public accept!: string;
  @Output() public readonly fileSelected: EventEmitter<File> = new EventEmitter<File>();

  protected isDraggedOver: boolean = false;
  protected shouldRunTimeout: boolean = true;
  protected dragLeaveTimeout: ReturnType<typeof setTimeout> | null = null;

  public constructor(private readonly cdr: ChangeDetectorRef) {}

  protected onFileSelected(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.item(0);

    if (file) this.fileSelected.emit(file);
  }

  protected onDrag(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer?.files.item(0);

    if (file) this.fileSelected.emit(file);
    this.isDraggedOver = false;
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();

    this.isDraggedOver = true;
    this.shouldRunTimeout = false;
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();

    if (this.dragLeaveTimeout) {
      clearTimeout(this.dragLeaveTimeout);
    }

    this.shouldRunTimeout = true;
    this.dragLeaveTimeout = setTimeout(() => {
      if (this.shouldRunTimeout) {
        this.isDraggedOver = false;

        this.cdr.detectChanges();
      }
    }, 100);
  }
}

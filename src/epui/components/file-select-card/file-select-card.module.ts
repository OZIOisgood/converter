import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { EpuiTypographyModule } from '../typography/typography.module';
import { FileSelectCardComponent } from './file-select-card.component';

@NgModule({
  declarations: [FileSelectCardComponent],
  imports: [CommonModule, EpuiTypographyModule],
  exports: [FileSelectCardComponent]
})
export class EpuiFileSelectCardModule {}

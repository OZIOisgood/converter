import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { EpuiTypographyModule } from '../typography/typography.module';
import { ProgressCardComponent } from './progress-card.component';

@NgModule({
  declarations: [ProgressCardComponent],
  imports: [CommonModule, EpuiTypographyModule],
  exports: [ProgressCardComponent]
})
export class EpuiProgressCardModule {}

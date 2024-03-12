import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'epui-progress-card',
  templateUrl: './progress-card.component.html',
  styleUrls: ['./progress-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgressCardComponent {
  @Input() public value: number = -1;
}

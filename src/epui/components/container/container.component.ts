import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { EPUITheme } from '../../types/theme.types';
import { ContainerClassNameType, DefaultContainer } from './container.types';
import { convertToClassName } from '../../utils/string-helper';

@Component({
  selector: 'epui-container',
  template: `
    <div class="{{ compiledClassName }}">
      <ng-content></ng-content>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContainerComponent extends EPUITheme implements OnInit {
  @Input() public className!: ContainerClassNameType;

  public compiledClassName!: string;

  public ngOnInit(): void {
    this.compiledClassName = this.getCompiledClassName();
  }

  protected override getCompiledClassName(): string {
    let className = '';
    className += convertToClassName(DefaultContainer.className);
    if (this.className) className += convertToClassName(this.className);

    return twMerge(convertToClassName(className).split(' '));
  }
}

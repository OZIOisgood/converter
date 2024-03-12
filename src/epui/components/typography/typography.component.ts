import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { EPUITheme } from '../../types/theme.types';
import { DefaultTypography, TypographyClassNameType, TypographyIsBoldType, TypographySizeType, TypographySizesEnum } from './typography.types';
import { convertToClassName } from '../../utils/string-helper';

@Component({
  selector: 'epui-typography',
  template: `
    <span class="{{ compiledClassName }}">
      <ng-content></ng-content>
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TypographyComponent extends EPUITheme implements OnInit {
  @Input() public className: TypographyClassNameType = DefaultTypography.className;
  @Input() public size: TypographySizeType = DefaultTypography.size;
  @Input() public isBold: TypographyIsBoldType = DefaultTypography.isBold;

  public compiledClassName!: string;

  public ngOnInit(): void {
    this.compiledClassName = this.getCompiledClassName();
  }

  protected override getCompiledClassName(): string {
    let className = '';

    className += convertToClassName(TypographySizesEnum[this.size]);
    className += convertToClassName(this.isBold ? 'font-bold' : '');
    className += convertToClassName(this.className);

    return twMerge(convertToClassName(className).split(' '));
  }
}

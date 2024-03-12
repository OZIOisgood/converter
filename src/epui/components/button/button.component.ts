import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { EPUITheme } from '../../types/theme.types';
import { convertToClassName, objectToStr } from '../../utils/string-helper';
import {
  ButtonClassNameType,
  ButtonColorType,
  ButtonFullWidthType,
  ButtonSizeType,
  ButtonVariantType,
  ButtonVariantMapper,
  DefaultButton,
  DefaultButtonPropsMapper
} from './button.types';

@Component({
  selector: 'epui-button',
  template: `
    <button class="{{ compiledClassName }}">
      <ng-content></ng-content>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonComponent extends EPUITheme implements OnInit {
  @Input() public variant: ButtonVariantType = DefaultButton.variant;
  @Input() public size: ButtonSizeType = DefaultButton.size;
  @Input() public color: ButtonColorType = DefaultButton.color;
  @Input() public fullWidth!: ButtonFullWidthType;
  @Input() public className!: ButtonClassNameType;
  @Input() public rounded!: boolean;

  public compiledClassName!: string;

  public ngOnInit(): void {
    this.compiledClassName = this.getCompiledClassName();
  }

  protected override getCompiledClassName(): string {
    let className = '';

    className += convertToClassName(DefaultButtonPropsMapper[this.size]);

    const colorClasses = ButtonVariantMapper[this.variant];
    if (colorClasses) {
      className += convertToClassName(objectToStr(colorClasses[this.color]));
    }

    if (this.className) className += convertToClassName(this.className);
    if (this.rounded) className += convertToClassName('rounded-full');
    else className += convertToClassName('rounded-primary');
    if (this.fullWidth) className += convertToClassName('w-full');

    return twMerge(convertToClassName(className).split(' '));
  }
}

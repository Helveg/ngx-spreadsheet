import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';

@Directive({
  selector: '[nssContentEditable]',
})
export class ContentEditableDirective {
  @Input()
  set content(value: string) {
    this.element.innerText = value || '';
  }
  @Output()
  contentChange = new EventEmitter<string>();

  constructor(private elementRef: ElementRef<HTMLElement>) {
    this.element.tabIndex = 0;
  }

  @HostListener('blur', ['$event.target.value'])
  blur() {
    this.contentChange.emit(this.element.innerText);
  }

  get element(): HTMLElement {
    return this.elementRef.nativeElement as HTMLElement;
  }
}

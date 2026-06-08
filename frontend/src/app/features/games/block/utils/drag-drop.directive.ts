import { Directive, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Directive({
  selector: '[appBlockDraggable]',
  standalone: true
})
export class BlockDraggableDirective {
  @Input('appBlockDraggable') shapeId: number = 0;
  @Input() index: number = 0;
  @Input() disabled: boolean = false;
  
  @Output() dragStart = new EventEmitter<{event: PointerEvent, index: number, el: HTMLElement}>();
  @Output() dragMove = new EventEmitter<{event: PointerEvent, index: number, x: number, y: number}>();
  @Output() dragEnd = new EventEmitter<{event: PointerEvent, index: number, el: HTMLElement}>();

  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private currentX = 0;
  private currentY = 0;
  
  // Y-offset to prevent the finger from hiding the block on touch devices
  private readonly touchYOffset = -80; 

  constructor(private el: ElementRef<HTMLElement>) {
    this.el.nativeElement.style.touchAction = 'none'; // Prevent scrolling while dragging
  }

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent) {
    if (this.disabled) return;
    event.preventDefault();
    
    this.isDragging = true;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.currentX = 0;
    
    // Apply Y offset if it's a touch pointer
    this.currentY = event.pointerType === 'touch' ? this.touchYOffset : 0;

    const el = this.el.nativeElement;
    el.style.position = 'fixed';
    el.style.zIndex = '9999';
    el.style.pointerEvents = 'none'; // Let events pass through to dropzone
    el.setPointerCapture(event.pointerId);

    this.updateTransform();
    this.dragStart.emit({ event, index: this.index, el });
  }

  @HostListener('pointermove', ['$event'])
  onPointerMove(event: PointerEvent) {
    if (!this.isDragging) return;
    
    const deltaX = event.clientX - this.startX;
    const deltaY = event.clientY - this.startY;
    
    this.currentX = deltaX;
    this.currentY = deltaY + (event.pointerType === 'touch' ? this.touchYOffset : 0);
    
    this.updateTransform();
    this.dragMove.emit({ event, index: this.index, x: event.clientX, y: event.clientY });
  }

  @HostListener('pointerup', ['$event'])
  @HostListener('pointercancel', ['$event'])
  onPointerUp(event: PointerEvent) {
    if (!this.isDragging) return;
    this.isDragging = false;
    
    const el = this.el.nativeElement;
    el.style.position = '';
    el.style.zIndex = '';
    el.style.pointerEvents = '';
    el.style.transform = '';
    el.releasePointerCapture(event.pointerId);

    this.dragEnd.emit({ event, index: this.index, el });
  }

  private updateTransform() {
    this.el.nativeElement.style.transform = `translate(${this.currentX}px, ${this.currentY}px) scale(1.1)`;
  }
}

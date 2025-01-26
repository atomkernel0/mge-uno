import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-color-picker-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './color-picker-dialog.component.html',
  styleUrls: ['./color-picker-dialog.component.scss'],
})
export class ColorPickerDialogComponent {
  @Output() colorSelected = new EventEmitter<string>();
  colors = ['red', 'blue', 'green', 'yellow'];
  highlightedColor: string | null = null;

  highlightColor(color: string) {
    this.highlightedColor = color;
  }

  resetHighlight() {
    this.highlightedColor = null;
  }

  selectColor(color: string): void {
    this.colorSelected.emit(color);
  }
}

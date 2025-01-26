import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ColorPickerDialogComponent } from './color-picker-dialog.component';

describe('ColorPickerDialogComponent', () => {
  let component: ColorPickerDialogComponent;
  let fixture: ComponentFixture<ColorPickerDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColorPickerDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ColorPickerDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.colors).toEqual(['red', 'blue', 'green', 'yellow']);
      expect(component.highlightedColor).toBeNull();
    });
  });

  describe('UI Elements', () => {
    it('should render the color picker overlay', () => {
      const overlay = fixture.debugElement.query(
        By.css('.color-picker-overlay')
      );
      expect(overlay).toBeTruthy();
    });

    it('should render all corner elements', () => {
      const corners = fixture.debugElement.queryAll(By.css('.corner'));
      expect(corners.length).toBe(4);
    });

    it('should render background image', () => {
      const background = fixture.debugElement.query(By.css('.background'));
      expect(background).toBeTruthy();
      expect(background.nativeElement.src).toContain(
        '/assets/wild_card/wild_back.webp'
      );
    });
  });

  describe('Color Interactions', () => {
    it('should highlight color on mouseenter', () => {
      const greenCorner = fixture.debugElement.query(
        By.css('.corner.top-left')
      );
      greenCorner.triggerEventHandler('mouseenter', null);
      fixture.detectChanges();

      expect(component.highlightedColor).toBe('green');
      const greenOverlay = fixture.debugElement.query(
        By.css('.color-overlay[src*="green.webp"]')
      );
      expect(
        greenOverlay.nativeElement.classList.contains('highlight')
      ).toBeTrue();
    });

    it('should reset highlight on mouseleave', () => {
      component.highlightColor('red');
      fixture.detectChanges();

      const redCorner = fixture.debugElement.query(
        By.css('.corner.bottom-right')
      );
      redCorner.triggerEventHandler('mouseleave', null);
      fixture.detectChanges();

      expect(component.highlightedColor).toBeNull();
    });

    it('should emit selected color on click', () => {
      spyOn(component.colorSelected, 'emit');
      const blueCorner = fixture.debugElement.query(
        By.css('.corner.bottom-left')
      );

      blueCorner.triggerEventHandler('click', null);
      fixture.detectChanges();

      expect(component.colorSelected.emit).toHaveBeenCalledWith('blue');
    });
  });

  describe('Color Overlay Behavior', () => {
    it('should apply correct positioning to color overlays', () => {
      const overlays = fixture.debugElement.queryAll(By.css('.color-overlay'));
      overlays.forEach((overlay) => {
        const element = overlay.nativeElement;
        const styles = window.getComputedStyle(element);

        expect(styles.position).toBe('fixed');

        const transform = styles.transform;
        expect(transform).toBeTruthy();
        expect(transform).toMatch(/matrix|translate/);
      });
    });

    it('should load correct image for each color', () => {
      const colorPaths = {
        'top-left': 'green.webp',
        'top-right': 'yellow.webp',
        'bottom-right': 'red.webp',
        'bottom-left': 'blue.webp',
      };

      Object.entries(colorPaths).forEach(([position, imagePath]) => {
        const corner = fixture.debugElement.query(
          By.css(`.corner.${position}`)
        );
        const image = corner.query(By.css('.color-overlay'));
        expect(image.nativeElement.src).toContain(imagePath);
      });
    });
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VictoryDialogComponent } from './victory-dialog.component';
import { By } from '@angular/platform-browser';

describe('VictoryDialogComponent', () => {
  let component: VictoryDialogComponent;
  let fixture: ComponentFixture<VictoryDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VictoryDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VictoryDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Structure', () => {
    it('should have victory title', () => {
      const titleElement = fixture.debugElement.query(By.css('h1'));
      expect(titleElement.nativeElement.textContent).toContain('VICTOIRE');
    });

    it('should have congratulations message', () => {
      const congratsElement = fixture.debugElement.query(
        By.css('.congratulations')
      );
      expect(congratsElement.nativeElement.textContent).toBe('Félicitations !');
    });

    it('should have winner info section', () => {
      const winnerInfoElement = fixture.debugElement.query(
        By.css('.winner-info')
      );
      expect(winnerInfoElement).toBeTruthy();
    });
  });

  describe('Input Properties', () => {
    it('should display winner message', () => {
      const testMessage = 'Test Winner Message';
      component.winnerMessage = testMessage;
      fixture.detectChanges();

      const messageElement = fixture.debugElement.query(By.css('h2'));
      expect(messageElement.nativeElement.textContent).toBe(testMessage);
    });

    it('should display winner avatar', () => {
      const testAvatarPath = 'test/avatar/path.png';
      component.winnerAvatar = testAvatarPath;
      fixture.detectChanges();

      const avatarElement = fixture.debugElement.query(
        By.css('.winner-avatar')
      );
      expect(avatarElement.nativeElement.src).toContain(testAvatarPath);
    });

    it('should display default avatar when no avatar provided', () => {
      component.winnerAvatar = '';
      fixture.detectChanges();

      const avatarElement = fixture.debugElement.query(
        By.css('.winner-avatar')
      );
      expect(avatarElement.nativeElement.src).toContain(
        'assets/profile_picture/default.png'
      );
    });
  });

  describe('Styling', () => {
    it('should have victory-overlay with correct styles', () => {
      const overlayElement = fixture.debugElement.query(
        By.css('.victory-overlay')
      );
      const styles = window.getComputedStyle(overlayElement.nativeElement);

      expect(styles.position).toBe('fixed');
      expect(styles.zIndex).toBe('1000');
    });

    it('should have confetti animation element', () => {
      const confettiElement = fixture.debugElement.query(By.css('.confetti'));
      expect(confettiElement).toBeTruthy();
    });

    it('should have winner avatar with correct styles', () => {
      const avatarElement = fixture.debugElement.query(
        By.css('.winner-avatar')
      );
      expect(avatarElement.nativeElement.classList).toContain('winner-avatar');
    });
  });
});

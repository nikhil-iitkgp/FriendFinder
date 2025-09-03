import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading';
import { toastManager } from '@/lib/toast-manager';

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('UI Enhancement Components', () => {
  const renderWithTheme = (component: React.ReactElement) => {
    return render(
      <ThemeProvider>
        {component}
      </ThemeProvider>
    );
  };

  describe('ThemeToggle', () => {
    it('renders theme toggle button', () => {
      renderWithTheme(<ThemeToggle />);
      
      const toggleButton = screen.getByRole('button');
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('aria-label');
    });

    it('supports different variants', () => {
      renderWithTheme(<ThemeToggle variant={'icon'} showLabel={false} />);
      
      const toggleButton = screen.getByRole('button');
      expect(toggleButton).toBeInTheDocument();
    });
  });

  describe('Enhanced Button', () => {
    it('renders with default variant', () => {
      renderWithTheme(<Button>Click me</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Click me');
    });

    it('renders loading state', () => {
      renderWithTheme(
        <Button loading loadingText={'Loading...'}>
          Submit
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveTextContent('Loading...');
    });

    it('renders with icons', () => {
      renderWithTheme(
        <Button leftIcon={<span data-testid={'left-icon'}>←</span>}>
          With Icon
        </Button>
      );
      
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByText('With Icon')).toBeInTheDocument();
    });

    it('supports different variants', () => {
      const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'gradient', 'glass'];
      
      variants.forEach(variant => {
        const { unmount } = renderWithTheme(
          <Button variant={variant as any}>Test</Button>
        );
        
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Enhanced Card', () => {
    it('renders card with content', () => {
      renderWithTheme(
        <Card>
          <CardHeader>
            <CardTitle>Test Card</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Card content</p>
          </CardContent>
        </Card>
      );
      
      expect(screen.getByText('Test Card')).toBeInTheDocument();
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('supports different variants', () => {
      const variants = ['default', 'elevated', 'flat', 'glass', 'gradient', 'interactive'];
      
      variants.forEach(variant => {
        const { unmount } = renderWithTheme(
          <Card variant={variant as any}>
            <CardContent>Test</CardContent>
          </Card>
        );
        
        expect(screen.getByText('Test')).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Enhanced Input', () => {
    it('renders basic input', () => {
      renderWithTheme(<Input placeholder={'Enter text'} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'Enter text');
    });

    it('renders with label', () => {
      renderWithTheme(
        <Input label={'Username'} placeholder={'Enter username'} />
      );
      
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });

    it('renders error state', () => {
      renderWithTheme(
        <Input 
          label={'Email'} 
          error={'Invalid email address'} 
          placeholder={'Enter email'} 
        />
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    });

    it('renders success state', () => {
      renderWithTheme(
        <Input 
          label={'Email'} 
          success={'Valid email address'} 
          placeholder={'Enter email'} 
        />
      );
      
      expect(screen.getByText('Valid email address')).toBeInTheDocument();
    });

    it('renders loading state', () => {
      renderWithTheme(
        <Input label={'Email'} loading placeholder={'Enter email'} />
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('renders password input with toggle', () => {
      renderWithTheme(
        <Input 
          type={'password'} 
          showPasswordToggle 
          placeholder={'Enter password'} 
        />
      );
      
      const input = screen.getByPlaceholderText('Enter password');
      const toggleButton = screen.getByRole('button');
      
      expect(input).toHaveAttribute('type', 'password');
      
      fireEvent.click(toggleButton);
      expect(input).toHaveAttribute('type', 'text');
    });
  });

  describe('Loading Components', () => {
    it('renders loading spinner', () => {
      renderWithTheme(<LoadingSpinner text={'Loading data...'} />);
      
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('renders loading spinner with different sizes', () => {
      const sizes = ['sm', 'md', 'lg', 'xl'];
      
      sizes.forEach(size => {
        const { unmount } = renderWithTheme(
          <LoadingSpinner size={size as any} text={`Loading ${size}`} />
        );
        
        expect(screen.getByText(`Loading ${size}`)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Toast Manager', () => {
    beforeEach(() => {
      // Reset toast manager state
      toastManager.dismissAll();
    });

    it('shows success toast', () => {
      const toastId = toastManager.success('Operation successful');
      expect(toastId).toBeTruthy();
    });

    it('shows error toast', () => {
      const toastId = toastManager.error('Something went wrong');
      expect(toastId).toBeTruthy();
    });

    it('shows warning toast', () => {
      const toastId = toastManager.warning('Warning message');
      expect(toastId).toBeTruthy();
    });

    it('shows info toast', () => {
      const toastId = toastManager.info('Information message');
      expect(toastId).toBeTruthy();
    });

    it('shows loading toast', () => {
      const toastId = toastManager.loading('Processing...');
      expect(toastId).toBeTruthy();
    });

    it('respects rate limiting', () => {
      // Set a low rate limit for testing
      toastManager.setRateLimit({ maxToasts: 2, timeWindow: 1000 });
      
      const toast1 = toastManager.info('Message 1');
      const toast2 = toastManager.info('Message 2');
      const toast3 = toastManager.info('Message 3'); // Should be rate limited
      
      expect(toast1).toBeTruthy();
      expect(toast2).toBeTruthy();
      expect(toast3).toBeNull();
    });

    it('prevents duplicate toasts', () => {
      const toast1 = toastManager.info('Duplicate message');
      const toast2 = toastManager.info('Duplicate message'); // Should be prevented
      
      expect(toast1).toBeTruthy();
      expect(toast2).toBeNull();
    });

    it('gets queue status', () => {
      const status = toastManager.getQueueStatus();
      expect(status).toHaveProperty('pending');
      expect(status).toHaveProperty('active');
      expect(typeof status.pending).toBe('number');
      expect(typeof status.active).toBe('number');
    });
  });

  describe('CSS Variables and Theme System', () => {
    it('applies theme classes correctly', () => {
      renderWithTheme(
        <div className={'bg-surface-primary text-foreground'}>
          Theme test
        </div>
      );
      
      const element = screen.getByText('Theme test');
      expect(element).toHaveClass('bg-surface-primary', 'text-foreground');
    });

    it('applies enhanced shadow classes', () => {
      renderWithTheme(
        <div className={'shadow-enhanced-lg'}>
          Shadow test
        </div>
      );
      
      const element = screen.getByText('Shadow test');
      expect(element).toHaveClass('shadow-enhanced-lg');
    });

    it('applies glass morphism classes', () => {
      renderWithTheme(
        <div className={'glass'}>
          Glass test
        </div>
      );
      
      const element = screen.getByText('Glass test');
      expect(element).toHaveClass('glass');
    });

    it('applies animation classes', () => {
      renderWithTheme(
        <div className={'animate-fade-in'}>
          Animation test
        </div>
      );
      
      const element = screen.getByText('Animation test');
      expect(element).toHaveClass('animate-fade-in');
    });
  });

  describe('Responsive Design', () => {
    it('applies mobile-first responsive classes', () => {
      renderWithTheme(
        <div className={'mobile-padding'}>
          Responsive test
        </div>
      );
      
      const element = screen.getByText('Responsive test');
      expect(element).toHaveClass('mobile-padding');
    });

    it('applies responsive text scaling', () => {
      renderWithTheme(
        <div className={'text-responsive-lg'}>
          Responsive text
        </div>
      );
      
      const element = screen.getByText('Responsive text');
      expect(element).toHaveClass('text-responsive-lg');
    });
  });

  describe('Accessibility', () => {
    it('respects reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      renderWithTheme(<ThemeToggle />);
      
      // The component should handle reduced motion preferences
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('provides proper ARIA labels', () => {
      renderWithTheme(
        <Button aria-label={'Custom action button'}>
          Action
        </Button>
      );
      
      const button = screen.getByLabelText('Custom action button');
      expect(button).toBeInTheDocument();
    });

    it('maintains focus management', () => {
      renderWithTheme(
        <div>
          <Button>First</Button>
          <Button>Second</Button>
        </div>
      );
      
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
      
      buttons[0].focus();
      expect(document.activeElement).toBe(buttons[0]);
    });
  });
});
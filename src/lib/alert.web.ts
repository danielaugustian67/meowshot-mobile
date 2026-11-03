import type { AlertButton, AlertOptions } from 'react-native';

import { Colors } from '@/constants/theme';
import { strings } from '@/lib/i18n';
import { getPrefs } from '@/lib/prefs';

function palette() {
  const { theme } = getPrefs();
  const dark = theme === 'system' ? window.matchMedia('(prefers-color-scheme: dark)').matches : theme === 'dark';
  return Colors[dark ? 'dark' : 'light'];
}

/** `Alert` does nothing in react-native-web and `window.confirm` can't name its buttons, so this draws the dialog. */
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
    const colors = palette();
    const choices: AlertButton[] = buttons?.length ? buttons : [{ text: strings().common.ok }];
    const cancel = choices.find((b) => b.style === 'cancel');

    const backdrop = document.createElement('div');
    Object.assign(backdrop.style, {
      position: 'fixed',
      inset: '0',
      // Above the Modal react-native-web draws.
      zIndex: '10001',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    });

    const box = document.createElement('div');
    box.setAttribute('role', 'alertdialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', title);
    Object.assign(box.style, {
      width: '100%',
      maxWidth: '320px',
      padding: '20px',
      borderRadius: '16px',
      backgroundColor: colors.background,
      color: colors.text,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    });

    const heading = document.createElement('div');
    heading.textContent = title;
    Object.assign(heading.style, { fontSize: '17px', fontWeight: '600', overflowWrap: 'anywhere' });
    box.append(heading);

    if (message) {
      const body = document.createElement('div');
      body.textContent = message;
      Object.assign(body.style, { fontSize: '14px', lineHeight: '20px', color: colors.textSecondary });
      box.append(body);
    }

    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      flexDirection: choices.length > 2 ? 'column' : 'row',
      justifyContent: 'flex-end',
      gap: '8px',
      marginTop: '8px',
    });

    function close(choice?: AlertButton) {
      document.removeEventListener('keydown', onKey);
      backdrop.remove();
      choice?.onPress?.();
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && cancel) close(cancel);
    }

    for (const choice of choices) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = choice.text ?? strings().common.ok;
      Object.assign(button.style, {
        padding: '10px 14px',
        minHeight: '44px',
        border: 'none',
        borderRadius: '10px',
        background: 'none',
        font: 'inherit',
        fontSize: '16px',
        fontWeight: choice.style === 'cancel' ? '400' : '600',
        color: choice.style === 'destructive' ? colors.danger : choice.style === 'cancel' ? colors.text : colors.tint,
        cursor: 'pointer',
      });
      button.addEventListener('click', () => close(choice));
      row.append(button);
    }
    box.append(row);
    backdrop.append(box);

    if (options?.cancelable) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) close(cancel);
      });
    }
    document.addEventListener('keydown', onKey);
    document.body.append(backdrop);
    // The default keeps Enter from confirming something destructive.
    (row.querySelector('button') as HTMLButtonElement).focus();
  },
};

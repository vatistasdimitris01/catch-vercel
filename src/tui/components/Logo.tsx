import React from 'react';
import { Box, Text } from 'ink';

const LOGO: string[] = [
  '  ██████  ██████  ███████ ████████ ██████  ██████  ██    ██ ',
  '  ██   ██ ██   ██ ██         ██    ██   ██ ██   ██  ██  ██  ',
  '  ██████  ██████  █████      ██    ██████  ██████    ████   ',
  '  ██      ██      ██         ██    ██      ██  ██     ██    ',
  '  ██      ██      ███████    ██    ██      ██   ██    ██    ',
];

const LOGO_SMALL: string[] = [
  '╔═══════════════════════════╗',
  '║         C A T C H         ║',
  '╚═══════════════════════════╝',
];

export function Logo({ width }: { width: number }) {
  if (width >= 56) {
    return (
      <Box flexDirection="column" alignItems="center">
        {LOGO.map((line, i) => (
          <Text key={i} color="#7f9db5">
            {line}
          </Text>
        ))}
      </Box>
    );
  }
  return (
    <Box flexDirection="column" alignItems="center">
      {LOGO_SMALL.map((line, i) => (
        <Text key={i} color="#7f9db5" bold>
          {line}
        </Text>
      ))}
    </Box>
  );
}

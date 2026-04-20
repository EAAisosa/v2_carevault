/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your CareVault password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>CareVault</Text>
        </Section>
        <Heading style={h1}>Reset your password</Heading>
        <Text style={text}>
          We received a request to reset your CareVault password. Click the button below to choose a new one.
        </Text>
        <Section style={{ textAlign: 'center', margin: '30px 0' }}>
          <Button style={button} href={confirmationUrl}>
            Reset Password
          </Button>
        </Section>
        <Text style={footer}>
          If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
        </Text>
        <Text style={legal}>
          CareVault · FHIR R4 Compliant · Secured with end-to-end encryption
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const header = { borderBottom: '2px solid hsl(186, 72%, 24%)', paddingBottom: '16px', marginBottom: '24px' }
const brand = { fontSize: '20px', fontWeight: 'bold' as const, color: 'hsl(186, 72%, 24%)', margin: 0, letterSpacing: '0.5px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(210, 40%, 11%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(210, 15%, 35%)', lineHeight: '1.6', margin: '0 0 16px' }
const button = {
  backgroundColor: 'hsl(186, 72%, 24%)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '10px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '13px', color: 'hsl(210, 15%, 50%)', margin: '24px 0 0', lineHeight: '1.5' }
const legal = { fontSize: '11px', color: 'hsl(210, 15%, 60%)', margin: '24px 0 0', textAlign: 'center' as const, borderTop: '1px solid #eee', paddingTop: '16px' }

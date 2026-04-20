/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your CareVault verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>CareVault</Text>
        </Section>
        <Heading style={h1}>Confirm reauthentication</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can safely ignore this email.
        </Text>
        <Text style={legal}>
          CareVault · FHIR R4 Compliant · Secured with end-to-end encryption
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const header = { borderBottom: '2px solid hsl(186, 72%, 24%)', paddingBottom: '16px', marginBottom: '24px' }
const brand = { fontSize: '20px', fontWeight: 'bold' as const, color: 'hsl(186, 72%, 24%)', margin: 0, letterSpacing: '0.5px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(210, 40%, 11%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(210, 15%, 35%)', lineHeight: '1.6', margin: '0 0 16px' }
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: 'hsl(186, 72%, 24%)',
  letterSpacing: '4px',
  textAlign: 'center' as const,
  margin: '0 0 30px',
  padding: '16px',
  backgroundColor: 'hsl(210, 20%, 98%)',
  borderRadius: '10px',
}
const footer = { fontSize: '13px', color: 'hsl(210, 15%, 50%)', margin: '24px 0 0', lineHeight: '1.5' }
const legal = { fontSize: '11px', color: 'hsl(210, 15%, 60%)', margin: '24px 0 0', textAlign: 'center' as const, borderTop: '1px solid #eee', paddingTop: '16px' }

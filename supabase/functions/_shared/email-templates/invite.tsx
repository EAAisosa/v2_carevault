/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
  recipient?: string
}

export const InviteEmail = ({
  siteUrl,
  confirmationUrl,
  recipient,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You have been granted access to CareVault — Nigeria's National Health Records Platform</Preview>
    <Body style={main}>
      <Container style={container}>

        {/* Header */}
        <Section style={header}>
          <Text style={brand}>CareVault</Text>
          <Text style={brandSub}>National Health Records Integration & Repository Programme</Text>
        </Section>

        {/* Body */}
        <Section style={body}>
          <Heading style={h1}>You've been invited to CareVault</Heading>

          <Text style={text}>
            You have been granted access to{' '}
            <Link href={siteUrl} style={link}>CareVault</Link>
            {' '}— Nigeria's secure, centralised national health records platform.
          </Text>

          <Text style={text}>
            CareVault gives authorised healthcare professionals a unified view of patient
            records across facilities, enabling faster, better-informed clinical decisions.
          </Text>

          <Text style={text}>
            To complete your registration and set your password, click the button below.
            This invitation link is valid for <strong>24 hours</strong>.
          </Text>

          <Section style={ctaSection}>
            <Button style={button} href={confirmationUrl}>
              Accept Invitation & Set Password
            </Button>
          </Section>

          <Text style={smallText}>
            Or copy and paste this link into your browser:
          </Text>
          <Text style={urlText}>
            <Link href={confirmationUrl} style={link}>{confirmationUrl}</Link>
          </Text>
        </Section>

        <Hr style={divider} />

        {/* Security notice */}
        <Section>
          <Text style={securityHeading}>Security Notice</Text>
          <Text style={securityText}>
            This invitation was sent to{' '}
            <strong>{recipient || 'your email address'}</strong>.
            If you did not expect this invitation, please disregard this email — no account
            will be created until you follow the link above. Do not forward this email to
            anyone.
          </Text>
        </Section>

        <Hr style={divider} />

        {/* Footer */}
        <Section style={footerSection}>
          <Text style={footerText}>
            <strong>CareVault</strong> · Federal Ministry of Health, Nigeria
          </Text>
          <Text style={footerText}>
            FHIR R4 Compliant &nbsp;·&nbsp; NDPA 2023 Compliant &nbsp;·&nbsp; End-to-End Encrypted
          </Text>
          <Text style={footerText}>
            <Link href={siteUrl} style={footerLink}>{siteUrl}</Link>
          </Text>
        </Section>

      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = {
  backgroundColor: '#f4f6f8',
  fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  maxWidth: '580px',
  margin: '32px auto',
  borderRadius: '8px',
  overflow: 'hidden' as const,
  border: '1px solid #e2e8f0',
}

const header = {
  backgroundColor: 'hsl(186, 72%, 20%)',
  padding: '28px 32px',
}

const brand = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#ffffff',
  margin: '0 0 4px',
  letterSpacing: '0.5px',
}

const brandSub = {
  fontSize: '11px',
  color: 'rgba(255,255,255,0.7)',
  margin: 0,
  letterSpacing: '0.3px',
  textTransform: 'uppercase' as const,
}

const body = {
  padding: '32px 32px 24px',
}

const h1 = {
  fontSize: '20px',
  fontWeight: '700' as const,
  color: '#1a202c',
  margin: '0 0 20px',
}

const text = {
  fontSize: '14px',
  color: '#4a5568',
  lineHeight: '1.7',
  margin: '0 0 16px',
}

const smallText = {
  fontSize: '12px',
  color: '#718096',
  margin: '20px 0 4px',
}

const urlText = {
  fontSize: '12px',
  color: '#718096',
  margin: '0 0 16px',
  wordBreak: 'break-all' as const,
}

const link = {
  color: 'hsl(186, 72%, 28%)',
  textDecoration: 'underline',
}

const ctaSection = {
  textAlign: 'center' as const,
  margin: '28px 0',
}

const button = {
  backgroundColor: 'hsl(186, 72%, 20%)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '6px',
  padding: '14px 32px',
  textDecoration: 'none',
  display: 'inline-block',
}

const divider = {
  borderColor: '#e2e8f0',
  margin: '0 32px',
}

const securityHeading = {
  fontSize: '11px',
  fontWeight: '700' as const,
  color: '#718096',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '24px 32px 8px',
}

const securityText = {
  fontSize: '13px',
  color: '#718096',
  lineHeight: '1.6',
  margin: '0 32px 24px',
}

const footerSection = {
  backgroundColor: '#f7fafc',
  padding: '20px 32px',
  borderTop: '1px solid #e2e8f0',
  textAlign: 'center' as const,
}

const footerText = {
  fontSize: '11px',
  color: '#a0aec0',
  margin: '0 0 4px',
  lineHeight: '1.6',
}

const footerLink = {
  color: '#a0aec0',
  textDecoration: 'none',
}

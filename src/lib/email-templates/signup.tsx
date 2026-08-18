import * as React from 'react'
import { Link, Text } from '@react-email/components'
import { AuthEmailLayout, link, text } from './auth-layout'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <AuthEmailLayout
    preview={`Confirm your email for ${siteName}`}
    heading="Confirm your email"
    ctaLabel="Verify email"
    ctaUrl={confirmationUrl}
    footerNote="If you didn't create an account, you can safely ignore this email."
  >
    <Text style={text}>
      Thanks for signing up for{' '}
      <Link href={siteUrl} style={link}>
        <strong>{siteName}</strong>
      </Link>{' '}
      — the Global AI Use Case Repository, AI Opportunity Map and AI Use Case Studio™.
    </Text>
    <Text style={text}>
      Please confirm{' '}
      <Link href={`mailto:${recipient}`} style={link}>
        {recipient}
      </Link>{' '}
      to activate your access.
    </Text>
  </AuthEmailLayout>
)

export default SignupEmail

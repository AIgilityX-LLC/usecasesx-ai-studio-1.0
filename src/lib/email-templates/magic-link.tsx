import * as React from 'react'
import { Text } from '@react-email/components'
import { AuthEmailLayout, text } from './auth-layout'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <AuthEmailLayout
    preview={`Your sign-in link for ${siteName}`}
    heading="Your sign-in link"
    ctaLabel="Sign in"
    ctaUrl={confirmationUrl}
    footerNote="This link expires shortly and can be used once."
  >
    <Text style={text}>
      Use the button below to sign in to {siteName}. If you did not request this link, you
      can ignore this email.
    </Text>
  </AuthEmailLayout>
)

export default MagicLinkEmail

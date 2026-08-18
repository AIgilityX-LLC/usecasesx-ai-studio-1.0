import * as React from 'react'
import { Link, Text } from '@react-email/components'
import { AuthEmailLayout, link, text } from './auth-layout'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address; the email is delivered to the new
  // address, so the "from" line renders oldEmail.
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <AuthEmailLayout
    preview={`Confirm your email change for ${siteName}`}
    heading="Confirm your new email"
    ctaLabel="Confirm change"
    ctaUrl={confirmationUrl}
    footerNote="If you did not request this change, contact us immediately."
  >
    <Text style={text}>
      You requested to change the email address on your {siteName} account from{' '}
      <Link href={`mailto:${oldEmail}`} style={link}>
        {oldEmail}
      </Link>{' '}
      to{' '}
      <Link href={`mailto:${newEmail}`} style={link}>
        {newEmail}
      </Link>
      .
    </Text>
  </AuthEmailLayout>
)

export default EmailChangeEmail

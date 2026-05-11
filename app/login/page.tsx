import { proConnectEnabled } from '@/lib/auth'
import LoginClient from './LoginClient'

export default function LoginPage() {
  return <LoginClient proConnectEnabled={proConnectEnabled} />
}

import { useEffect, useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { verifyEmail } from '../services/api.js'
import { refreshUser } from '../app/sessionSlice.js'
import Icon from '../components/Icon.jsx'
import Mark from '../components/Mark.jsx'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const session = useSelector((s) => s.session)
  
  const [status, setStatus] = useState('verifying')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMsg('No verification token provided in the URL.')
      return
    }

    let mounted = true

    async function attemptVerify() {
      try {
        await verifyEmail(token)
        if (!mounted) return
        
        // If the user is logged in, refresh their status right away
        if (session.user) {
          await dispatch(refreshUser()).unwrap()
        }
        
        setStatus('success')
        
        // Auto-redirect after 3 seconds
        setTimeout(() => {
          if (mounted) navigate('/')
        }, 3000)
      } catch (err) {
        if (!mounted) return
        setStatus('error')
        setErrorMsg(err.message || 'Failed to verify email. The link may have expired.')
      }
    }

    attemptVerify()

    return () => {
      mounted = false
    }
  }, [token, dispatch, session.user, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md paper rounded-ticket shadow-paper-lift p-8 text-center animate-slide-in-right">
        <div className="flex justify-center mb-6">
          <Mark size={40} />
        </div>
        
        {status === 'verifying' && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full border-2 border-rule-strong border-t-ink animate-spin mx-auto"></div>
            <h1 className="text-xl font-bold text-ink tracking-tight">Verifying your email...</h1>
            <p className="text-sm text-ink-secondary">Please wait while we confirm your account.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-buy-mark/10 text-buy-mark rounded-full flex items-center justify-center mx-auto shadow-inset-line">
              <Icon name="check" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-ink tracking-tight">Email Verified!</h1>
            <p className="text-sm text-ink-secondary leading-relaxed">
              Your account has been successfully verified. You now have full access to the trading desk.
            </p>
            <div className="pt-4">
              <Link to="/" className="desk-tab inline-block w-full bg-buy-text text-paper-50 font-bold py-3 rounded-ticket shadow-paper hover:shadow-paper-lift transition-all">
                Enter the Trading Desk
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-sell-mark/10 text-sell-mark rounded-full flex items-center justify-center mx-auto shadow-inset-line">
              <Icon name="x" size={32} />
            </div>
            <h1 className="text-xl font-bold text-ink tracking-tight">Verification Failed</h1>
            <p className="text-sm text-sell-text font-medium leading-relaxed bg-sell-text/5 p-3 rounded-ticket border border-sell-text/20">
              {errorMsg}
            </p>
            <div className="pt-4">
              <Link to="/login" className="desk-tab inline-block w-full bg-transparent border-2 border-rule text-ink hover:border-rule-strong font-bold py-2.5 rounded-ticket transition-all">
                Return to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { Icon } from '@/components/icons'
import { AppConfig } from '@/config'
import { Separator } from '../ui/separator'
import { isArkeoEnabled } from '@/lib/arkeo-provider'

export function Footer() {
  const arkeoActive = isArkeoEnabled()

  return (
    <footer className="bg-tyler fixed inset-x-0 bottom-0 mx-auto hidden md:block">
      <div className="container mx-auto border-t p-4">
        <div className="text-thor-gray flex items-center justify-between gap-4 text-xs">
          <div className="flex h-4 items-center gap-2">
            <a href={AppConfig.privacyPolicyLink} rel="noopener noreferrer" target="_blank">
              Privacy Policy
            </a>
            <Separator orientation="vertical" className="bg-andy h-full" />
            <a href={AppConfig.tosLink} rel="noopener noreferrer" target="_blank">
              Terms of Use
            </a>
            <Separator orientation="vertical" className="bg-andy h-full" />
            <div className="flex items-center gap-1">
              <span>Built by</span>
              <Icon name="unstoppable" className="size-3" />
              <a className="underline" href="https://x.com/unstoppablebyhs" rel="noopener noreferrer" target="_blank">
                Unstoppable Wallet
              </a>
            </div>
            {arkeoActive && (
              <>
                <Separator orientation="vertical" className="bg-andy h-full" />
                <a
                  className="flex items-center gap-1 underline text-emerald-400 hover:text-emerald-300 transition-colors"
                  href="https://arkeomarketplace.com"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  ⚡ RPC powered by Arkeo
                </a>
              </>
            )}
          </div>
          <a className="flex items-center gap-2 underline" href={AppConfig.discordLink} rel="noopener noreferrer" target="_blank">
            Get Support in Discord <Icon width={20} height={20} viewBox="0 0 20 20" name="discord" />
          </a>
        </div>
      </div>
    </footer>
  )
}

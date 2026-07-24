import { useKillSwitchStore } from '../stores/killSwitchStore'
import { KillSwitchKey } from '../services/killSwitch'

type UseKillSwitchResult = {
  isEnabled: boolean
  disabledMessage: string
  isFetching: boolean
}

export function useKillSwitch(key: KillSwitchKey): UseKillSwitchResult {
  const isEnabled = useKillSwitchStore((s) => s.isEnabled(key))
  const disabledMessage = useKillSwitchStore((s) => s.disabledMessage(key))
  const isFetching = useKillSwitchStore((s) => s.isFetching)

  return { isEnabled, disabledMessage, isFetching }
}

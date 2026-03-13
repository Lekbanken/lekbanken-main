import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerRlsClient } from '@/lib/supabase/server'
import { logUserAuditEvent } from '@/lib/services/userAudit.server'
import { apiHandler } from '@/lib/api/route-handler'

const removeDeviceSchema = z.object({
  device_id: z.string().min(1),
})

export const POST = apiHandler({
  auth: 'user',
  input: removeDeviceSchema,
  handler: async ({ auth, body }) => {
    const user = auth!.user!
    const supabase = await createServerRlsClient()

    const { error } = await supabase
      .from('user_devices')
      .delete()
      .eq('id', body.device_id)
      .eq('user_id', user.id)
    if (error) {
      console.error('[accounts/devices/remove] delete error', error)
      return NextResponse.json({ error: 'Failed to remove device' }, { status: 500 })
    }

    await logUserAuditEvent({
      userId: user.id,
      actorUserId: user.id,
      eventType: 'device_removed',
      payload: { device_id: body.device_id },
    })

    return NextResponse.json({ success: true })
  },
})

import { expect,it,vi } from 'vitest'
import { api } from '../../shared/api/client'
import { checkIn,completeTask } from './api'
vi.mock('../../shared/api/client',()=>({api:vi.fn()}))
it('sends caregiver commands once with CSRF bootstrap and the exact visit/task route',async()=>{
  const signal=new AbortController().signal
  const input={expectedVersion:0,clientRequestId:'uuid',locationSource:'MANUAL_LOCATION_NOTE' as const,locationNote:'doorway'}
  await checkIn(3,input,signal);expect(api).toHaveBeenNthCalledWith(1,'/auth/csrf',{signal});expect(api).toHaveBeenNthCalledWith(2,'/visits/3/check-in',{method:'POST',body:JSON.stringify(input),signal})
  const task={expectedVersion:1,clientRequestId:'uuid-2',status:'REFUSED' as const,outcome:'',caregiverNote:'Factual reason'}
  await completeTask(3,8,task,signal);expect(api).toHaveBeenNthCalledWith(4,'/visits/3/tasks/8/complete',{method:'POST',body:JSON.stringify(task),signal})
})

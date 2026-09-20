import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FamilyHome from './index'

const savedApplication = {
  id: 23,
  applicantFamilyMemberId: 2,
  targetElderName: 'Tan Mei',
  targetElderAge: null,
  targetAddress: '12 Example Road',
  postalCode: '012345',
  mobilityLevel: 'INDEPENDENT',
  preferredDialects: null,
  careNeeds: [],
  medicalNotes: null,
  status: 'SUBMITTED',
  reviewRemarks: null,
  reviewedAt: null,
  elderId: null,
  createdAt: '2026-09-20T08:00:00Z',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

function openForm(path = '/family/intake/new') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/family/*" element={<FamilyHome />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function fillRequired() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Elder full name'), '  Tan Mei  ')
  await user.type(screen.getByLabelText('Home address'), '  12 Example Road  ')
  await user.type(screen.getByLabelText('Postal code'), '012345')
  return user
}

beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn())
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/'
})

describe('Family intake submission', () => {
  it('blocks overlong fields and invalid ages, then accepts corrected values at contract boundaries', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init: RequestInit) => {
      if (url.endsWith('/csrf')) return Promise.resolve(new Response(null))
      return Promise.resolve(json(savedApplication, init.method === 'POST' ? 201 : 200))
    })
    vi.stubGlobal('fetch', fetchMock)
    openForm()
    const user = userEvent.setup()
    const fields = [
      ['Elder full name', '𠮷'.repeat(101), '𠮷'.repeat(100)],
      ['Home address', 'a'.repeat(256), 'a'.repeat(255)],
      ['Postal code', '1'.repeat(11), '01234-ABCD'],
      ['Preferred dialects', 'a'.repeat(101), 'a'.repeat(100)],
    ]
    for (const [label, value] of fields)
      fireEvent.change(screen.getByLabelText(label), { target: { value } })
    await user.click(screen.getByRole('button', { name: 'Submit application' }))
    for (const [label] of fields)
      expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true')
    expect(fetchMock).not.toHaveBeenCalled()
    for (const [label, , value] of fields)
      fireEvent.change(screen.getByLabelText(label), { target: { value } })
    for (const value of ['-1', '1.5', 'abc', '2147483648']) {
      fireEvent.change(screen.getByLabelText('Age'), { target: { value } })
      await user.click(screen.getByRole('button', { name: 'Submit application' }))
      expect(screen.getByLabelText('Age')).toHaveAttribute('aria-invalid', 'true')
      expect(fetchMock).not.toHaveBeenCalled()
    }
    fireEvent.change(screen.getByLabelText('Age'), { target: { value: '75' } })
    await user.click(screen.getByRole('button', { name: 'Submit application' }))
    await screen.findByRole('heading', { name: 'Application submitted' })
    const posted = fetchMock.mock.calls.find(([, init]) => init.method === 'POST')
    expect(JSON.parse(posted?.[1].body as string)).toMatchObject({
      targetElderName: '𠮷'.repeat(100),
      targetAddress: 'a'.repeat(255),
      postalCode: '01234-ABCD',
      preferredDialects: 'a'.repeat(100),
      targetElderAge: 75,
    })
  })

  it('prevents duplicate submissions while preparing CSRF and while waiting for the saved record', async () => {
    let finishCsrf!: (response: Response) => void
    let finishPost!: (response: Response) => void
    const fetchMock = vi.fn().mockImplementation((url: string, init: RequestInit) => {
      if (url.endsWith('/csrf'))
        return new Promise<Response>((resolve) => {
          finishCsrf = resolve
        })
      if (init.method === 'POST')
        return new Promise<Response>((resolve) => {
          finishPost = resolve
        })
      return Promise.resolve(json(savedApplication))
    })
    vi.stubGlobal('fetch', fetchMock)
    openForm()
    const user = await fillRequired()
    await user.dblClick(screen.getByRole('button', { name: 'Submit application' }))
    expect(screen.getByRole('button', { name: 'Submitting…' })).toBeDisabled()
    expect(screen.getByLabelText('Elder full name')).toBeDisabled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await act(async () => {
      finishCsrf(new Response(null))
    })
    await user.click(screen.getByRole('button', { name: 'Submitting…' }))
    expect(fetchMock.mock.calls.filter(([, init]) => init.method === 'POST')).toHaveLength(1)
    await act(async () => {
      finishPost(json(savedApplication, 201))
    })
    expect(
      await screen.findByRole('heading', { name: 'Application submitted' }),
    ).toBeInTheDocument()
  })

  it('retains the form through session expiry and sign-in, requiring an explicit submission afterwards', async () => {
    let signedIn = false
    const fetchMock = vi.fn().mockImplementation((url: string, init: RequestInit) => {
      if (url.endsWith('/csrf')) {
        document.cookie = `XSRF-TOKEN=${signedIn ? 'new-token' : 'old-token'}; path=/`
        return Promise.resolve(new Response(null))
      }
      if (url.endsWith('/login')) {
        signedIn = true
        return Promise.resolve(
          json({ id: 1, username: 'family_test', displayName: 'Family', roles: ['FAMILY'] }),
        )
      }
      if (init.method === 'POST')
        return Promise.resolve(
          signedIn ? json(savedApplication, 201) : new Response(null, { status: 401 }),
        )
      return Promise.resolve(json(savedApplication))
    })
    vi.stubGlobal('fetch', fetchMock)
    openForm()
    const user = await fillRequired()
    await user.click(screen.getByRole('button', { name: 'Submit application' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in to submit')
    await user.type(screen.getByLabelText('Username'), 'family_test')
    await user.type(screen.getByLabelText('Password'), 'test-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(screen.queryByLabelText('Password')).not.toBeInTheDocument())
    expect(screen.getByLabelText('Elder full name')).toHaveValue('  Tan Mei  ')
    const submissions = () =>
      fetchMock.mock.calls.filter(
        ([url, init]) => url === '/api/intake-applications' && init.method === 'POST',
      )
    expect(submissions()).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Submit application' }))
    await screen.findByRole('heading', { name: 'Application submitted' })
    expect(submissions()).toHaveLength(2)
    expect(new Headers(submissions()[1][1].headers).get('X-XSRF-TOKEN')).toBe('new-token')
  })

  it.each([
    [400, 'Check your application'],
    [403, 'Submission not permitted'],
    [500, 'Submission status unknown'],
    [201, 'Submission status unknown'],
  ])(
    'handles an empty HTTP %s response without losing input or claiming success',
    async (status, title) => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockImplementation((url: string) =>
            Promise.resolve(new Response(null, { status: url.endsWith('/csrf') ? 200 : status })),
          ),
      )
      openForm()
      const user = await fillRequired()
      await user.click(screen.getByRole('button', { name: 'Submit application' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(title)
      expect(screen.getByLabelText('Home address')).toHaveValue('  12 Example Road  ')
      expect(screen.getByRole('button', { name: 'Submit application' })).toBeEnabled()
      expect(
        screen.queryByRole('heading', { name: 'Application submitted' }),
      ).not.toBeInTheDocument()
      if (status === 403) {
        await user.click(screen.getByRole('button', { name: 'Sign in again' }))
        expect(screen.getByLabelText('Username')).toBeInTheDocument()
      }
    },
  )

  it('does not send the application when CSRF preparation fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)
    openForm()
    const user = await fillRequired()
    await user.click(screen.getByRole('button', { name: 'Submit application' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your application has not been sent.',
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/csrf')
    expect(screen.getByLabelText('Postal code')).toHaveValue('012345')
  })

  it('stops awaiting a pending submission when leaving the form', async () => {
    let postSignal: AbortSignal | undefined
    const fetchMock = vi.fn().mockImplementation((url: string, init: RequestInit) => {
      if (url.endsWith('/csrf')) return Promise.resolve(new Response(null))
      postSignal = init.signal as AbortSignal
      return new Promise<Response>((_resolve, reject) => {
        postSignal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        )
      })
    })
    vi.stubGlobal('fetch', fetchMock)
    const view = openForm()
    const user = await fillRequired()
    await user.click(screen.getByRole('button', { name: 'Submit application' }))
    expect(postSignal?.aborted).toBe(false)
    view.unmount()
    expect(postSignal?.aborted).toBe(true)
  })

  it('keeps the confirmed application number when submission succeeds but the detail read fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string, init: RequestInit) => {
        if (url.endsWith('/csrf')) return Promise.resolve(new Response(null))
        return Promise.resolve(
          init.method === 'POST'
            ? json(savedApplication, 201)
            : new Response(null, { status: 500 }),
        )
      }),
    )
    openForm()
    const user = await fillRequired()
    await user.click(screen.getByRole('button', { name: 'Submit application' }))
    expect(
      await screen.findByRole('heading', { name: 'Application submitted' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Your application #23 has been received/)).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load applications')
  })

  it('keeps inputs after an ambiguous network failure and asks the family to check the list', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation((url: string) =>
        url.endsWith('/csrf')
          ? Promise.resolve(new Response(null))
          : Promise.reject(new TypeError('Failed to fetch')),
      )
    vi.stubGlobal('fetch', fetchMock)
    openForm()
    const user = await fillRequired()
    await user.click(screen.getByRole('button', { name: 'Submit application' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Submission status unknown')
    expect(screen.getByLabelText('Elder full name')).toHaveValue('  Tan Mei  ')
    expect(screen.getByRole('link', { name: /Check my applications/ })).toHaveAttribute(
      'target',
      '_blank',
    )
    expect(screen.queryByRole('heading', { name: 'Application submitted' })).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([, init]) => init.method === 'POST')).toHaveLength(1)
  })

  it('rejects whitespace-only required fields before contacting the server and retains the input', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    openForm()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Elder full name'), '   ')
    await user.type(screen.getByLabelText('Home address'), '   ')
    await user.type(screen.getByLabelText('Postal code'), '   ')
    await user.click(screen.getByRole('button', { name: 'Submit application' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please check the highlighted fields',
    )
    expect(screen.getByLabelText('Elder full name')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Elder full name')).toHaveValue('   ')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('submits optional details and distinct care needs without adding server-owned fields', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init: RequestInit) => {
      if (url.endsWith('/csrf')) return Promise.resolve(new Response(null))
      if (init.method === 'POST') return Promise.resolve(json(savedApplication, 201))
      return Promise.resolve(json(savedApplication))
    })
    vi.stubGlobal('fetch', fetchMock)
    openForm()
    const user = await fillRequired()
    await user.type(screen.getByLabelText('Age'), '0')
    await user.type(screen.getByLabelText('Preferred dialects'), 'Hokkien, Mandarin')
    await user.selectOptions(screen.getByLabelText('Mobility'), 'ASSISTIVE_CANE')
    await user.click(screen.getByRole('checkbox', { name: 'Bathing assistance' }))
    await user.click(screen.getByRole('checkbox', { name: 'Vital signs monitoring' }))
    await user.type(
      screen.getByLabelText('Other care needs'),
      'Meal preparation\nMeal preparation\nBATHING\n',
    )
    await user.type(screen.getByLabelText('Medical notes'), 'Discuss allergies with the care team.')
    await user.click(screen.getByRole('button', { name: 'Submit application' }))
    await screen.findByRole('heading', { name: 'Application submitted' })
    const posted = fetchMock.mock.calls.find(([, init]) => init.method === 'POST')
    expect(JSON.parse(posted?.[1].body as string)).toEqual({
      targetElderName: 'Tan Mei',
      targetAddress: '12 Example Road',
      postalCode: '012345',
      targetElderAge: 0,
      preferredDialects: 'Hokkien, Mandarin',
      mobilityLevel: 'ASSISTIVE_CANE',
      careNeeds: ['BATHING', 'VITALS', 'Meal preparation'],
      medicalNotes: 'Discuss allergies with the care team.',
    })
  })

  it('opens the form from the list, submits required fields and shows the saved application', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init: RequestInit) => {
      if (url === '/api/auth/csrf') {
        document.cookie = 'XSRF-TOKEN=submission-token; path=/'
        return Promise.resolve(new Response(null))
      }
      if (url === '/api/intake-applications' && init.method === 'POST') {
        expect(JSON.parse(init.body as string)).toEqual({
          targetElderName: 'Tan Mei',
          targetAddress: '12 Example Road',
          postalCode: '012345',
          mobilityLevel: 'INDEPENDENT',
          careNeeds: [],
        })
        expect(new Headers(init.headers).get('X-XSRF-TOKEN')).toBe('submission-token')
        expect(init.credentials).toBe('include')
        return Promise.resolve(json(savedApplication, 201))
      }
      if (url.endsWith('/23')) return Promise.resolve(json(savedApplication))
      return Promise.resolve(json({ items: [], page: 0, size: 20, totalElements: 0 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    openForm('/family/intake')
    await userEvent.setup().click(await screen.findByRole('link', { name: 'New application' }))
    expect(screen.getByRole('heading', { name: 'New care application' })).toBeInTheDocument()
    const user = await fillRequired()
    await user.click(screen.getByRole('button', { name: 'Submit application' }))
    expect(
      await screen.findByRole('heading', { name: 'Application submitted' }),
    ).toBeInTheDocument()
    expect(screen.getByText('APPLICATION #23')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tan Mei' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Submit application' })).not.toBeInTheDocument()
  })
})

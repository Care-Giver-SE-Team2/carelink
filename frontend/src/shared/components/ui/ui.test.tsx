import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MemoryRouter } from 'react-router-dom'
import {
  AppHeader,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  NavSidebar,
  NumberInput,
  PlanTreeView,
  Select,
  Timeline,
  VisitStateBadge,
} from './index'
import type { PlanTreeItem } from './index'

afterEach(cleanup)

describe('Button', () => {
  it('is a non-submitting button by default and honours disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Publish
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Publish' })
    expect(button).toHaveAttribute('type', 'button')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('Badge', () => {
  it('appends the version, except for an elder with no plan', () => {
    render(
      <>
        <Badge status="published" version={4} />
        <Badge status="none" version={3} />
      </>,
    )
    expect(screen.getByText('PUBLISHED v4')).toBeInTheDocument()
    expect(screen.getByText('NO PLAN YET')).toBeInTheDocument()
  })
})

describe('VisitStateBadge', () => {
  it('labels each visit state', () => {
    render(
      <>
        <VisitStateBadge state="in_visit" />
        <VisitStateBadge state="no_checkin" />
        <VisitStateBadge state="needs_cover" />
      </>,
    )
    expect(screen.getByText('IN VISIT')).toBeInTheDocument()
    expect(screen.getByText('NO CHECK-IN')).toBeInTheDocument()
    expect(screen.getByText('NEEDS COVER')).toBeInTheDocument()
  })
})

describe('AppHeader', () => {
  it('shows the user and role, and logs out', async () => {
    const onLogout = vi.fn()
    render(<AppHeader user={{ name: 'Tan Mei Ling', roleLabel: 'CARE MGR' }} onLogout={onLogout} />)
    expect(screen.getByText('CareLink')).toBeInTheDocument()
    expect(screen.getByText(/^Today · [A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2} \d{4} · \d{2}:\d{2}$/)).toBeInTheDocument()
    expect(screen.getByText('Tan Mei Ling')).toBeInTheDocument()
    expect(screen.getByText('CARE MGR')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })

  it('lets a page replace the clock and the user block', () => {
    render(<AppHeader contextLine="Elders / care plan" trailing={<span>DRAFT</span>} user={{ name: 'Tan Mei Ling', roleLabel: 'CARE MGR' }} onLogout={() => {}} />)
    expect(screen.getByText('Elders / care plan')).toBeInTheDocument()
    expect(screen.getByText('DRAFT')).toBeInTheDocument()
    expect(screen.queryByText('Tan Mei Ling')).not.toBeInTheDocument()
  })
})

describe('NavSidebar', () => {
  it('marks the current route active and shows counts', () => {
    render(
      <MemoryRouter initialEntries={['/app/elders']}>
        <NavSidebar
          items={[
            { label: 'Today', href: '/app', end: true },
            { label: 'Exceptions', href: '/app/exceptions', count: 4, countTone: 'danger' },
            { label: 'Elders', href: '/app/elders' },
          ]}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /Elders/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /Today/ })).not.toHaveAttribute('aria-current')
    expect(within(screen.getByRole('link', { name: /Exceptions/ })).getByText('4')).toBeInTheDocument()
  })

  it('hides a count of zero', () => {
    render(
      <MemoryRouter>
        <NavSidebar items={[{ label: 'Exceptions', href: '/app/exceptions', count: 0, countTone: 'danger' }]} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Exceptions' })).toHaveTextContent(/^EExceptions$/)
  })
})

describe('DataTable', () => {
  type Row = { id: string; name: string; late: boolean }
  const rows: Row[] = [
    { id: 'a', name: 'Lim Ah Kow', late: false },
    { id: 'b', name: 'Mohd Yusof', late: true },
  ]

  it('renders headers, cells, a tinted row and the footer', () => {
    render(
      <DataTable
        label="Visits"
        columns={[
          { key: 'name', label: 'Elder', width: '1fr' },
          { key: 'late', label: 'State', width: '100px', render: (r) => (r.late ? 'LATE' : 'OK') },
        ]}
        rows={rows}
        rowKey={(r) => r.id}
        rowTone={(r) => (r.late ? 'danger' : null)}
        footer="2 visits"
      />,
    )
    const table = screen.getByRole('table', { name: 'Visits' })
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Elder', 'State'])
    const [, first, second] = within(table).getAllByRole('row')
    expect(within(first).getByText('Lim Ah Kow')).toBeInTheDocument()
    expect(within(second).getByText('LATE')).toBeInTheDocument()
    expect(second.className).not.toBe(first.className)
    expect(screen.getByText('2 visits')).toBeInTheDocument()
  })

  it('shows the empty note when there are no rows', () => {
    render(<DataTable label="Visits" columns={[]} rows={[]} rowKey={() => ''} empty="No visits today." />)
    expect(screen.getByText('No visits today.')).toBeInTheDocument()
  })
})

describe('Timeline', () => {
  it('lists the steps in order with their notes and the footnote', () => {
    render(
      <Timeline
        steps={[
          { label: 'Reported', sub: '09:12', state: 'done' },
          { label: 'Notified', sub: 'unacknowledged', state: 'active' },
          { label: 'Supervisor', state: 'pending' },
        ]}
        footnote="Assembled at run time."
      />,
    )
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Reported09:12',
      'Notifiedunacknowledged',
      'Supervisor',
    ])
    expect(screen.getByText('Assembled at run time.')).toBeInTheDocument()
  })
})

describe('NumberInput', () => {
  it('keeps digits only and reports an empty field as null', () => {
    const onChange = vi.fn()
    render(<NumberInput aria-label="minutes" value={30} onChange={onChange} suffix="min" />)
    const input = screen.getByLabelText('minutes')
    fireEvent.change(input, { target: { value: '4a5' } })
    expect(onChange).toHaveBeenLastCalledWith(45)
    fireEvent.change(input, { target: { value: '' } })
    expect(onChange).toHaveBeenLastCalledWith(null)
  })
})

describe('Select', () => {
  it('shows the placeholder until a grouped option is chosen', async () => {
    const onChange = vi.fn()
    render(
      <Select
        aria-label="Activity"
        placeholder="Select an activity…"
        value=""
        onChange={onChange}
        options={[{ group: 'Personal care', items: [{ value: 'groom', label: 'Grooming' }] }]}
      />,
    )
    expect(screen.getAllByText('Select an activity…').length).toBeGreaterThan(0)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Activity' }), 'groom')
    expect(onChange).toHaveBeenCalledWith('groom')
  })
})

describe('ConfirmDialog', () => {
  function renderDialog(props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        tone="danger"
        eyebrow="Delete sub-plan"
        title='Delete "Health monitoring"?'
        confirmLabel="Delete sub-plan"
        onConfirm={onConfirm}
        onCancel={onCancel}
        {...props}
      >
        This removes both tasks.
      </ConfirmDialog>,
    )
    return { onConfirm, onCancel }
  }

  it('is a labelled modal dialog that focuses Cancel, not the destructive action', () => {
    renderDialog()
    const dialog = screen.getByRole('dialog', { name: 'Delete "Health monitoring"?' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('cancels on Esc and on a backdrop click, and confirms on the confirm button', async () => {
    const { onConfirm, onCancel } = renderDialog()
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('dialog').parentElement!)
    expect(onCancel).toHaveBeenCalledTimes(2)

    await userEvent.click(screen.getByRole('button', { name: 'Delete sub-plan' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('ignores Esc and disables both buttons while busy', async () => {
    const { onCancel } = renderDialog({ busy: true })
    await userEvent.keyboard('{Escape}')
    expect(onCancel).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete sub-plan' })).toBeDisabled()
  })
})

describe('PlanTreeView', () => {
  const items: PlanTreeItem[] = [
    {
      kind: 'subplan',
      id: 's1',
      name: 'Personal care',
      weekly: '2.75 h',
      tasks: [
        {
          kind: 'task',
          id: 't1',
          label: 'Bathing assistance · Mon, Wed, Fri',
          perVisit: '30–60 m',
          perVisitDetail: 'Mon 30 m · Wed 45 m · Fri 60 m',
          weekly: '2.25 h',
        },
      ],
    },
  ]

  it('is read-only on its own: no row actions, but sub-plans still toggle', async () => {
    const onToggle = vi.fn()
    render(<PlanTreeView items={items} collapsedIds={new Set(['s1'])} onToggle={onToggle} total="2.75 h" />)
    expect(screen.getAllByRole('button')).toHaveLength(1)
    const toggle = screen.getByRole('button', { name: 'Personal care' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(onToggle).toHaveBeenCalledWith('s1')
  })

  it('describes a per-visit range with its day-by-day breakdown', () => {
    render(<PlanTreeView items={items} collapsedIds={new Set()} onToggle={() => {}} total="2.75 h" />)
    expect(screen.getByText('30–60 m')).toHaveAccessibleDescription('Mon 30 m · Wed 45 m · Fri 60 m')
  })

  it('shows the empty message with a zero total', () => {
    render(<PlanTreeView items={[]} collapsedIds={new Set()} onToggle={() => {}} total="0.00 h" />)
    expect(screen.getByText('No sub-plans yet.')).toBeInTheDocument()
    expect(screen.getByText('0.00 h')).toBeInTheDocument()
  })
})

describe('shared tier boundary', () => {
  // Every role can use this library, so it must never reach into a role's folder.
  const sources = import.meta.glob(['./*.ts', './*.tsx', '!./*.test.tsx'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>

  it('imports nothing from a role folder', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(10)
    for (const [file, source] of Object.entries(sources)) {
      expect(source, file).not.toMatch(/from ['"][^'"]*routes\//)
    }
  })
})

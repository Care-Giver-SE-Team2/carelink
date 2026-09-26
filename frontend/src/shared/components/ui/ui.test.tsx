import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Badge, Button, ConfirmDialog, NumberInput, PlanTreeView, Select } from './index'
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

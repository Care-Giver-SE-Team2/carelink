/**
 * CareLink shared component library — the [Shared] tier of the care plan authoring
 * handoff's components.md. Role-agnostic: usable by every client (manager, caregiver,
 * family, admin). Nothing here may import from a role folder, hold care-plan business
 * logic, or check permissions; role-specific components live with their role (the
 * manager's are in routes/manager/components/) and compose these.
 *
 * Screens compose these rather than restyling buttons, badges, inputs, dialogs or lists
 * locally; page CSS should only place them (grid, spacing, alignment). Colours and fonts
 * come from the tokens in shared/theme/theme.css.
 */
export { Button } from './Button'
export type { ButtonVariant } from './Button'
export { IconButton } from './IconButton'
export { Badge, Tag } from './Badge'
export type { BadgeStatus } from './Badge'
export { BodyText, Eyebrow, MetaText, PageTitle, RowTitle } from './Typography'
export { DateInput, Field, NumberInput, SearchField, TextInput, TimeInput } from './Inputs'
export { Select } from './Select'
export type { SelectGroup, SelectItem } from './Select'
export { DayToggle } from './DayToggle'
export { Avatar, Callout, Card, IdentityHeader, KeyValueList, PersonCard } from './Surfaces'
export { BackLink, PageHeader, SidePanel, SplitLayout } from './Layout'
export { ListRow } from './ListRow'
export { PlanTreeView } from './PlanTreeView'
export type { PlanTreeItem, PlanTreeSubPlan, PlanTreeTask } from './PlanTreeView'
export { ConfirmDialog, Modal } from './Modal'

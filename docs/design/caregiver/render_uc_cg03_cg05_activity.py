"""Render the UC-CG03 + UC-CG05 activity diagram as a portable PNG.

The matching PlantUML source is kept alongside this renderer.  This compact
renderer exists so the design remains previewable in environments without a
PlantUML JAR.
"""

from pathlib import Path
from math import hypot
import sys

from PIL import Image, ImageDraw, ImageFont


ENGLISH = "--en" in sys.argv
OUT = Path(__file__).with_name(
    "UC-CG03-CG05-activity-en.png" if ENGLISH else "UC-CG03-CG05-activity.png"
)
W, H = 2500, 4140
LANES = [
    (60, 500, "Caregiver"),
    (500, 980, "System / Visit state"),
    (980, 1420, "Elder"),
    (1420, 1880, "Manager"),
    (1880, 2440, "Family notification"),
]

BG = "#FFFFFF"
INK = "#26323F"
MUTED = "#667085"
LANE = "#EEF3F8"
SYSTEM = "#EDF6FF"
CARE = "#EAF7EF"
ELDER = "#FFF8E8"
MANAGER = "#F3EDFF"
FAMILY = "#FFF0F0"
OBJECT = "#FFF7CC"
DECISION = "#FFF3D8"
EXCEPTION = "#FDECEC"

EN = {
    "UC-CG03 + UC-CG05  执行访视至独立服务确认": "UC-CG03 + UC-CG05 — Home Visit to Independent Service Confirmation",
    "数据对象的读取、创建或更新": "Data object read, created or updated",
    "打开已分配访视\n读取已批准照护计划": "Open assigned visit\nand approved care plan",
    "核验护理员、访视时段\n与当前状态": "Verify caregiver, visit window\nand current state",
    "状态迁移\n是否合法?": "Legal state\ntransition?",
    "显示拒绝原因\n保留原状态": "Show rejection reason\nand retain current state",
    "记录 SCHEDULED → ARRIVED": "Record SCHEDULED → ARRIVED",
    "打卡入场，开始服务": "Check in and begin care",
    "设置 Visit = IN_PROGRESS": "Set Visit = IN_PROGRESS",
    "执行计划任务\n记录结果与观察": "Perform planned tasks\nand record outcomes",
    "采集必需凭证\n与生命体征": "Capture required evidence\nand vital signs",
    "发现照护\n异常?": "Care exception\nfound?",
    "上报事实与严重程度\n（UC-CG04）": "Report facts and severity\n(UC-CG04)",
    "创建 Incident\n设置 Visit = EXCEPTION": "Create Incident\nand set Visit = EXCEPTION",
    "接管并升级\nUC-MG05 · UC-SYS02": "Take over and escalate\nUC-MG05 · UC-SYS02",
    "必需任务与\n凭证是否齐全?": "Required tasks and\nevidence complete?",
    "显示缺失或被拒绝项目": "Show missing or rejected item",
    "离场核销并提交\n访视完成": "Check out and submit\nvisit completion",
    "记录 IN_PROGRESS → COMPLETED\n设置 Visit = COMPLETED": "Record IN_PROGRESS → COMPLETED\nand set Visit = COMPLETED",
    "在授权范围内收到\n访视完成通知": "Receive permitted\nvisit-completion notification",
    "独立核对已完成访视": "Review completed visit\nindependently",
    "确认\n服务?": "Confirm\nservice?",
    "创建 ElderConfirmation = CONFIRMED\n设置 Visit = VERIFIED": "Create ElderConfirmation = CONFIRMED\nand set Visit = VERIFIED",
    "处理争议 Incident\n接管 UC-MG05": "Handle disputed Incident\nunder UC-MG05",
    "超时未回应\n设置 Visit = AUTO_CLOSED": "No response by deadline\nset Visit = AUTO_CLOSED",
    "是": "yes",
    "否": "no",
    "补充": "complete",
    "提出异议": "dispute",
    "超时未回应": "no response",
}


def translate(text):
    return EN.get(text, text) if ENGLISH else text


def font(size, bold=False):
    root = Path("C:/Windows/Fonts")
    name = "msyhbd.ttc" if bold else "msyh.ttc"
    candidate = root / name
    return ImageFont.truetype(str(candidate), size)


F_TITLE = font(42, True)
F_SUB = font(24)
F_LANE = font(26, True)
F_NODE = font(24)
F_SMALL = font(20)
F_LABEL = font(20, True)


def center_text(draw, box, text, fnt, fill=INK, spacing=7):
    text = translate(text)
    left, top, right, bottom = box
    bbox = draw.multiline_textbbox((0, 0), text, font=fnt, spacing=spacing, align="center")
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.multiline_text(
        ((left + right - tw) / 2, (top + bottom - th) / 2 - bbox[1]),
        text,
        font=fnt,
        fill=fill,
        spacing=spacing,
        align="center",
    )


def node(draw, cx, y, text, fill, width=360, height=118, outline=INK, fnt=F_NODE):
    box = (cx - width // 2, y, cx + width // 2, y + height)
    draw.rounded_rectangle(box, radius=18, fill=fill, outline=outline, width=3)
    center_text(draw, box, text, fnt)
    return (cx, y, cx, y + height)


def object_node(draw, cx, y, text, width=330, height=58):
    box = (cx - width // 2, y, cx + width // 2, y + height)
    draw.rectangle(box, fill=OBJECT, outline="#A67C00", width=2)
    center_text(draw, box, text, F_SMALL, fill="#6B4F00", spacing=4)
    return (cx, y, cx, y + height)


def diamond(draw, cx, cy, text, width=300, height=132):
    points = [(cx, cy - height // 2), (cx + width // 2, cy), (cx, cy + height // 2), (cx - width // 2, cy)]
    draw.polygon(points, fill=DECISION, outline="#A66A00")
    draw.line(points + [points[0]], fill="#A66A00", width=3)
    center_text(draw, (cx - width // 2 + 42, cy - height // 2 + 12, cx + width // 2 - 42, cy + height // 2 - 12), text, F_NODE)
    return (cx, cy - height // 2, cx, cy + height // 2)


def arrow(draw, start, end, label=None, label_xy=None, color=INK, width=3):
    sx, sy = start
    ex, ey = end
    if sx == ex or sy == ey:
        points = [(sx, sy), (ex, ey)]
    else:
        mid_y = (sy + ey) // 2
        points = [(sx, sy), (sx, mid_y), (ex, mid_y), (ex, ey)]
    draw.line(points, fill=color, width=width, joint="curve")
    ah = 13
    if ey >= sy:
        head = [(ex, ey), (ex - ah, ey - ah), (ex + ah, ey - ah)]
    else:
        head = [(ex, ey), (ex - ah, ey + ah), (ex + ah, ey + ah)]
    draw.polygon(head, fill=color)
    if label:
        label = translate(label)
        lx, ly = label_xy if label_xy else ((sx + ex) // 2, (sy + ey) // 2)
        bbox = draw.textbbox((0, 0), label, font=F_LABEL)
        pad = 7
        rect = (lx - (bbox[2] - bbox[0]) // 2 - pad, ly - (bbox[3] - bbox[1]) // 2 - pad, lx + (bbox[2] - bbox[0]) // 2 + pad, ly + (bbox[3] - bbox[1]) // 2 + pad)
        draw.rounded_rectangle(rect, radius=5, fill=BG)
        draw.text((rect[0] + pad, rect[1] + pad - bbox[1]), label, font=F_LABEL, fill=color)


def arrow_path(draw, points, color=INK, width=3):
    """Draw a deliberately routed control-flow arrow."""
    draw.line(points, fill=color, width=width, joint="curve")
    (px, py), (ex, ey) = points[-2], points[-1]
    distance = hypot(ex - px, ey - py)
    vx, vy = ((ex - px) / distance, (ey - py) / distance)
    nx, ny = -vy, vx
    base_x, base_y = ex - vx * 18, ey - vy * 18
    draw.polygon(
        [(ex, ey), (base_x + nx * 9, base_y + ny * 9), (base_x - nx * 9, base_y - ny * 9)],
        fill=color,
    )


def branch_label(draw, x, y, text, color):
    text = translate(text)
    bbox = draw.textbbox((0, 0), text, font=F_LABEL)
    pad = 7
    rect = (x - pad, y - pad, x + bbox[2] - bbox[0] + pad, y + bbox[3] - bbox[1] + pad)
    draw.rounded_rectangle(rect, radius=5, fill=BG)
    draw.text((x, y - bbox[1]), text, font=F_LABEL, fill=color)


def terminator(draw, cx, cy, text="End"):
    draw.ellipse((cx - 34, cy - 34, cx + 34, cy + 34), fill=INK)
    draw.ellipse((cx - 23, cy - 23, cx + 23, cy + 23), fill=BG)
    draw.text((cx + 48, cy - 14), translate(text), font=F_SMALL, fill=MUTED)


image = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(image)

# Title and legend
center_text(draw, (60, 35, W - 60, 105), "UC-CG03 + UC-CG05  执行访视至独立服务确认", F_TITLE)
center_text(draw, (60, 112, W - 60, 150), "Activity Diagram · swimlanes + selected object flows", F_SUB, fill=MUTED)
draw.rounded_rectangle((1650, 165, 2380, 238), radius=12, fill="#FFFDF4", outline="#E0C96A", width=2)
object_node(draw, 1760, 181, "Object flow", width=180, height=42)
draw.text((1870, 188), translate("数据对象的读取、创建或更新"), font=F_SMALL, fill=MUTED)

# Swimlanes
for index, (left, right, title) in enumerate(LANES):
    fill = [CARE, SYSTEM, ELDER, MANAGER, FAMILY][index]
    draw.rectangle((left, 270, right, H - 70), fill="#FCFDFF", outline="#9AA7B5", width=2)
    draw.rectangle((left, 270, right, 332), fill=fill, outline="#9AA7B5", width=2)
    center_text(draw, (left + 8, 277, right - 8, 325), title, F_LANE)

# Top flow
draw.ellipse((245, 378, 275, 408), fill=INK)
open_visit = node(draw, 280, 440, "打开已分配访视\n读取已批准照护计划", CARE)
object_node(draw, 280, 575, "Visit · CarePlanSnapshot")
verify = node(draw, 740, 675, "核验护理员、访视时段\n与当前状态", SYSTEM, width=390)
legal = diamond(draw, 740, 900, "状态迁移\n是否合法?")
rejected = node(draw, 280, 900, "显示拒绝原因\n保留原状态", EXCEPTION, width=380)
object_node(draw, 280, 1038, "VisitStateTransition = REJECTED", width=390)
reject_end = (280, 1165)
terminator(draw, *reject_end)
arrived = node(draw, 740, 1055, "记录 SCHEDULED → ARRIVED", SYSTEM, width=390)
object_node(draw, 740, 1192, "VisitStateTransition = APPLIED", width=390)
check_in = node(draw, 280, 1305, "打卡入场，开始服务", CARE)
in_progress = node(draw, 740, 1450, "设置 Visit = IN_PROGRESS", SYSTEM, width=360, height=88)

arrow(draw, (260, 408), (280, 440))
arrow(draw, (280, 558), (740, 675))
arrow(draw, (740, 793), (740, 834))
arrow(draw, (590, 900), (470, 900), "no", (530, 858), color="#A33A3A")
arrow(draw, (280, 1018), reject_end)
arrow(draw, (740, 966), (740, 1055), "yes", (785, 1010), color="#26734D")
arrow(draw, (740, 1250), (280, 1305))
arrow(draw, (280, 1423), (740, 1450))

# Execution loop
tasks = node(draw, 280, 1600, "执行计划任务\n记录结果与观察", CARE, width=390)
object_node(draw, 280, 1738, "VisitTask")
evidence = node(draw, 280, 1830, "采集必需凭证\n与生命体征", CARE, width=390)
object_node(draw, 280, 1968, "VisitEvidence · VitalSign", width=390)
exception = diamond(draw, 740, 1900, "发现照护\n异常?")
report = node(draw, 280, 2085, "上报事实与严重程度\n（UC-CG04）", EXCEPTION, width=390)
incident = node(draw, 740, 2225, "创建 Incident\n设置 Visit = EXCEPTION", EXCEPTION, width=400)
object_node(draw, 740, 2363, "Incident [source = CAREGIVER]", width=390)
handoff = node(draw, 1650, 2225, "接管并升级\nUC-MG05 · UC-SYS02", MANAGER, width=390)
exception_end = (1650, 2445)
terminator(draw, *exception_end, text="Exception handoff")

complete = diamond(draw, 740, 2520, "必需任务与\n凭证是否齐全?")
missing = node(draw, 280, 2525, "显示缺失或被拒绝项目", EXCEPTION, width=390, height=88)
checkout = node(draw, 280, 2740, "离场核销并提交\n访视完成", CARE, width=390)
completed = node(draw, 740, 2880, "记录 IN_PROGRESS → COMPLETED\n设置 Visit = COMPLETED", SYSTEM, width=410)
object_node(draw, 740, 3018, "Visit · VisitStateTransition", width=390)
family_notice = node(draw, 2160, 2880, "在授权范围内收到\n访视完成通知", FAMILY, width=430)
object_node(draw, 2160, 3018, "Notification", width=250)

arrow(draw, (740, 1538), (280, 1600))
arrow(draw, (280, 1718), (280, 1830))
arrow(draw, (280, 1948), (590, 1900))
arrow(draw, (590, 1900), (470, 2085), "yes", (525, 1990), color="#A33A3A")
arrow(draw, (280, 2203), (740, 2225))
arrow(draw, (740, 2343), (1650, 2225))
arrow(draw, (1650, 2343), exception_end)
arrow_path(draw, [(740, 1966), (960, 2060), (960, 2400), (740, 2454)], color="#26734D")
branch_label(draw, 985, 2290, "否", "#26734D")
arrow(draw, (590, 2520), (470, 2525), "no", (530, 2475), color="#A33A3A")
arrow_path(draw, [(100, 2569), (72, 2569), (72, 1890), (100, 1890)], color="#A33A3A")
branch_label(draw, 88, 2190, "补充", "#A33A3A")
arrow(draw, (740, 2586), (280, 2740), "yes", (520, 2670), color="#26734D")
arrow(draw, (280, 2858), (740, 2880))
arrow(draw, (740, 2998), (2160, 2880))

# Independent confirmation stage
elder_review_y = 3095
elder_review = node(draw, 1200, elder_review_y, "独立核对已完成访视", ELDER, width=390, height=88)
confirm = diamond(draw, 1200, 3260, "确认\n服务?")
arrow(draw, (740, 3076), (1200, elder_review_y))
arrow(draw, (1200, elder_review_y + 88), (1200, 3194))

confirmed = node(draw, 740, 3410, "创建 ElderConfirmation = CONFIRMED\n设置 Visit = VERIFIED", SYSTEM, width=410)
verified_end = (740, 3610)
terminator(draw, *verified_end, text="Verified")

disputed_handoff = node(draw, 1650, 3410, "处理争议 Incident\n接管 UC-MG05", MANAGER, width=390)
disputed_end = (1650, 3610)
terminator(draw, *disputed_end, text="Dispute handoff")

auto_closed = node(draw, 740, 3790, "超时未回应\n设置 Visit = AUTO_CLOSED", SYSTEM, width=390)
auto_end = (740, 3970)
terminator(draw, *auto_end, text="Auto-closed")

arrow(draw, (1050, 3260), (740, 3410), "是", (910, 3345), color="#26734D")
arrow(draw, (740, 3528), verified_end)
arrow(draw, (1350, 3260), (1650, 3410), "提出异议", (1450, 3345), color="#A33A3A")
arrow(draw, (1650, 3528), disputed_end)
arrow_path(draw, [(1200, 3326), (960, 3380), (960, 3790), (740, 3790)], color=MUTED)
branch_label(draw, 995, 3670, "超时未回应", MUTED)
arrow(draw, (740, 3908), auto_end)

image.save(OUT)
print(OUT)

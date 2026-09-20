package sg.nus.carelink.careplan.controller.dto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;

import sg.nus.carelink.careplan.domain.model.CarePlanNode;

/**
 * A published task, in the shape the editor renders. Read-only: the editor doesn't round-trip a
 * plan for further edits (see CarePlanService.publish), it only redisplays the last published
 * version. groupName is a display-only label; the list itself is flat.
 *
 * <p>{@code visits} is rebuilt from scheduleDays + durationPerVisit, so a day-by-day schedule that
 * varied its minutes per day (the editor allows this) comes back with one shared duration across
 * its days — the same simplification the schema itself makes (duration_per_visit is a single
 * column, not one per day).
 */
public record CarePlanNodeResponse(
		Long id,
		String groupName,
		String name,
		List<VisitRequest> visits,
		CarePlanNode.EvidenceType evidenceType,
		BigDecimal weeklyHours) {

	/** The flat, published task list, in display order. */
	public static List<CarePlanNodeResponse> listFrom(List<CarePlanNode> nodes) {
		return nodes.stream()
				.sorted(Comparator.comparing(n -> n.displayOrder() == null ? 0 : n.displayOrder()))
				.map(CarePlanNodeResponse::of)
				.toList();
	}

	private static CarePlanNodeResponse of(CarePlanNode node) {
		return new CarePlanNodeResponse(
				node.id(), node.groupName(), node.name(), visitsFrom(node), node.evidenceType(), node.weeklyHours());
	}

	private static final List<String> WEEK = List.of("MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN");

	private static List<VisitRequest> visitsFrom(CarePlanNode node) {
		if (node.scheduleDays() == null || node.scheduleDays().isBlank() || node.durationPerVisit() == null) {
			return List.of();
		}
		int minutes = node.durationPerVisit()
				.multiply(BigDecimal.valueOf(60))
				.setScale(0, RoundingMode.HALF_UP)
				.intValue();
		List<String> days = "DAILY".equals(node.scheduleDays()) ? WEEK : List.of(node.scheduleDays().split(","));
		return days.stream()
				.map(day -> new VisitRequest(titleCase(day), minutes))
				.toList();
	}

	private static String titleCase(String day) {
		return day.charAt(0) + day.substring(1).toLowerCase();
	}
}

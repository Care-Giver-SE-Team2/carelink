package sg.nus.carelink.careplan.application;

/** One scheduled day for a TASK node, e.g. Mon at 30 minutes. */
public record VisitInput(String day, int minutes) {
}

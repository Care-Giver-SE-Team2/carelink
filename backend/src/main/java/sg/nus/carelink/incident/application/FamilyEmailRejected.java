package sg.nus.carelink.incident.application;

/** A negative SMTP reply proves non-acceptance. Carries no address or original exception text. @author Wang Zhili */
public class FamilyEmailRejected extends RuntimeException {
	private final boolean temporary;
	public FamilyEmailRejected(boolean temporary) { super("SMTP rejected the urgent email"); this.temporary = temporary; }
	public boolean temporary() { return temporary; }
}

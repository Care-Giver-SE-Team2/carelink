package sg.nus.carelink.incident.application;

/** Verification mail boundary; no incident or care details cross it. @author Wang Zhili */
public interface FamilyEmailVerificationSender {
	boolean configured();
	void send(String address, String token);
}

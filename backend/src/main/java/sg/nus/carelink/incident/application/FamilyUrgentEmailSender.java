package sg.nus.carelink.incident.application;

import sg.nus.carelink.incident.domain.model.FamilyAlertEvent;

/** SMTP acceptance is neither delivery to the person nor awareness. @author Wang Zhili */
public interface FamilyUrgentEmailSender {
	boolean configured();
	void send(String address, FamilyAlertEvent event);
}

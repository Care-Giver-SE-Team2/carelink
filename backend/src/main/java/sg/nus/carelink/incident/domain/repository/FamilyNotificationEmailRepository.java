package sg.nus.carelink.incident.domain.repository;

import sg.nus.carelink.incident.domain.model.FamilyNotificationEmail;

/** @author Wang Zhili */
public interface FamilyNotificationEmailRepository {
	FamilyNotificationEmail find(Long familyId);
	FamilyNotificationEmail lock(Long familyId);
	void save(FamilyNotificationEmail contact);
}

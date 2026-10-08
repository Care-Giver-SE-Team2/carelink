package sg.nus.carelink.incident.domain.service;

import sg.nus.carelink.incident.domain.model.FamilyAlertEvent;
import sg.nus.carelink.incident.domain.model.Incident;

/** Each channel owns its delivery rules and outcomes; sources know only incident events. @author Wang Zhili */
public interface FamilyAlertChannelStrategy {
	enum Channel { IN_APP, EMAIL }
	Channel channel();
	boolean deliver(FamilyAlertEvent event, Incident incident, Long familyId);
}

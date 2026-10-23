package sg.nus.carelink.profile.domain.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import sg.nus.carelink.profile.domain.model.ServiceApplication;
import sg.nus.carelink.profile.domain.model.ServiceApplicationPage;

/** New service requests are isolated from the legacy intake/elder-creation approval queue. */
public interface ServiceApplicationRepository {
    ServiceApplication save(ServiceApplication application);
    Optional<ServiceApplication> findById(Long id);
    ServiceApplicationPage findForApplicant(Long familyId, Set<Long> readableElderIds, int page, int size);
    /** Every service application made for this elder, by any family member, newest first. */
    List<ServiceApplication> findByElderId(Long elderId);
    /** Which of these elders any family member has made a service application for, in any status. */
    Set<Long> findElderIdsWithApplications(Set<Long> elderIds);
    /**
     * These elders' service applications that are neither declined nor recorded as planned, in no
     * particular order. Some may be planned already but not yet recorded (see recordPlanned).
     */
    List<ServiceApplication> findUnansweredByElderIds(Set<Long> elderIds);
    /** Records that these applications are fully planned, keeping the first time it was recorded. */
    void recordPlanned(Set<Long> applicationIds, LocalDateTime at);
}

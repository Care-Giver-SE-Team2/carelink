package sg.nus.carelink.report.application;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sg.nus.carelink.identity.application.IdentityService;
import sg.nus.carelink.profile.application.FamilyAccessQuery;
import sg.nus.carelink.profile.application.ProfileService;
import sg.nus.carelink.profile.domain.model.FamilyMember;
import sg.nus.carelink.profile.domain.repository.FamilyMemberRepository;
import sg.nus.carelink.report.domain.model.ValueAddedService;
import sg.nus.carelink.report.domain.model.ValueAddedServiceRequest;
import sg.nus.carelink.report.domain.repository.ValueAddedServiceRepository;
import sg.nus.carelink.report.domain.repository.ValueAddedServiceRequestRepository;
import sg.nus.carelink.shared.error.BusinessRuleViolation;
import sg.nus.carelink.shared.error.ResourceNotFound;
import sg.nus.carelink.visit.domain.model.Visit;
import sg.nus.carelink.visit.domain.repository.VisitRepository;

/** Application service for UC-EL02 and UC-FM08. */
@Service
@Transactional
public class ValueAddedServiceRequestService {
    private final IdentityService identity;
    private final ProfileService profiles;
    private final FamilyMemberRepository families;
    private final FamilyAccessQuery familyAccess;
    private final ValueAddedServiceRepository services;
    private final ValueAddedServiceRequestRepository requests;
    private final VisitRepository visits;
    private final Clock clock;

    public ValueAddedServiceRequestService(
            IdentityService identity,
            ProfileService profiles,
            FamilyMemberRepository families,
            FamilyAccessQuery familyAccess,
            ValueAddedServiceRepository services,
            ValueAddedServiceRequestRepository requests,
            VisitRepository visits,
            Clock clock) {
        this.identity = identity;
        this.profiles = profiles;
        this.families = families;
        this.familyAccess = familyAccess;
        this.services = services;
        this.requests = requests;
        this.visits = visits;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<ValueAddedService> availableServices() {
        return services.findAvailable();
    }

    /** UC-EL02: list the current elder's own requests. */
    @Transactional(readOnly = true)
    public List<ValueAddedServiceRequest> listForElderUser(Long userId) {
        Long elderId = profiles.requireElderByUserId(userId).id();
        return requests.findByElderId(elderId);
    }

    /** UC-EL02: create a PENDING_APPROVAL request. */
    public ValueAddedServiceRequest requestForElderUser(
            Long userId,
            Long serviceId,
            LocalDateTime requestedSchedule,
            String specialInstructions) {
        Long elderId = profiles.requireElderByUserId(userId).id();
        ValueAddedService service = requireService(serviceId);
        if (!service.available()) {
            throw new BusinessRuleViolation(
                    "VALUE_ADDED_SERVICE_UNAVAILABLE",
                    "The selected value-added service is not currently available.");
        }
        return requests.save(ValueAddedServiceRequest.requestedByElder(
                elderId, serviceId, requestedSchedule, specialInstructions));
    }

    /** UC-FM08: list requests for an elder that the current family account may read. */
    @Transactional(readOnly = true)
    public List<ValueAddedServiceRequest> listForFamily(String username, Long elderId) {
        familyAccess.requireReadableElder(username, elderId);
        return requests.findByElderId(elderId);
    }

    /**
     * UC-FM08: approve or reject. Approval immediately creates an unassigned SCHEDULED Visit,
     * which is the work order described by the API contract, and stores its id on the request.
     */
    public ValueAddedServiceRequest decideForFamily(String username, Long requestId, Decision decision) {
        var account = identity.require(username);
        FamilyMember family = families.findByUserId(account.id())
                .orElseThrow(() -> new ResourceNotFound("Family member for user", account.id()));
        ValueAddedServiceRequest request = requireRequest(requestId);
        familyAccess.requireWritableElder(username, request.elderId());

        if (decision == Decision.REJECTED) {
            return requests.save(request.reject(family.id(), now()));
        }

        ValueAddedService service = requireService(request.valueAddedServiceId());
        if (request.requestedSchedule() == null) {
            throw new BusinessRuleViolation(
                    "VALUE_ADDED_SERVICE_SCHEDULE_REQUIRED",
                    "A requested schedule is required before the service can be approved.");
        }
        Visit visit = visits.save(Visit.scheduled(
                request.elderId(), null, null, null,
                service.name(), request.requestedSchedule(), null));
        return requests.save(request.approveAndDispatch(family.id(), visit.id(), now()));
    }

    @Transactional(readOnly = true)
    public ValueAddedService requireService(Long id) {
        return services.findById(id)
                .orElseThrow(() -> new ResourceNotFound("Value-added service", id));
    }

    private ValueAddedServiceRequest requireRequest(Long id) {
        return requests.findById(id)
                .orElseThrow(() -> new ResourceNotFound("Value-added service request", id));
    }

    private LocalDateTime now() {
        return LocalDateTime.now(clock).withNano(0);
    }

    public enum Decision {
        APPROVED, REJECTED
    }
}

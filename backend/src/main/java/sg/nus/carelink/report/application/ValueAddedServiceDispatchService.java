package sg.nus.carelink.report.application;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sg.nus.carelink.identity.application.IdentityService;
import sg.nus.carelink.report.domain.model.ValueAddedService;
import sg.nus.carelink.report.domain.model.ValueAddedServiceRequest;
import sg.nus.carelink.report.domain.repository.ValueAddedServiceRepository;
import sg.nus.carelink.report.domain.repository.ValueAddedServiceRequestRepository;
import sg.nus.carelink.rostering.application.VisitCover;
import sg.nus.carelink.shared.error.BusinessRuleViolation;
import sg.nus.carelink.shared.error.ResourceNotFound;
import sg.nus.carelink.visit.application.VisitReassignment;

/**
 * The manager's side of an extra service once the elder has asked for it: every request with
 * where its work order stands, a caregiver for a dispatched visit nobody holds, and calling a
 * request off. Also keeps a dispatched request in step with its visit, so the elder and family
 * see it completed or cancelled when the visit is.
 *
 * <p>Visits are read and changed only through the visit and rostering modules' contracts.
 */
@Service
@Transactional
public class ValueAddedServiceDispatchService {

    /** Visit states in which the work order was carried out. */
    static final Set<String> CARRIED_OUT = Set.of("COMPLETED", "VERIFIED", "AUTO_CLOSED");

    static final String CANCEL_REASON = "The extra service was cancelled by a manager";

    private final ValueAddedServiceRequestRepository requests;
    private final ValueAddedServiceRepository services;
    private final VisitReassignment visits;
    private final VisitCover cover;
    private final IdentityService identity;

    public ValueAddedServiceDispatchService(
            ValueAddedServiceRequestRepository requests,
            ValueAddedServiceRepository services,
            VisitReassignment visits,
            VisitCover cover,
            IdentityService identity) {
        this.requests = requests;
        this.services = services;
        this.visits = visits;
        this.cover = cover;
        this.identity = identity;
    }

    /** Every request, newest first, each with its service's name and its visit as it stands. */
    @Transactional(readOnly = true)
    public List<ManagedRequest> listForManager() {
        Map<Long, String> names = services.findAll().stream()
                .collect(Collectors.toMap(ValueAddedService::id, ValueAddedService::name, (a, b) -> a));
        return requests.findAll().stream()
                .map(request -> managed(request, names.get(request.valueAddedServiceId())))
                .toList();
    }

    /** Who can take the dispatched visit, best first, then who cannot and why. */
    @Transactional(readOnly = true)
    public List<VisitCover.Option> caregiverOptions(Long requestId) {
        return cover.options(dispatchedVisitId(requireRequest(requestId)));
    }

    /** Puts a caregiver on a dispatched visit that has none. */
    public ManagedRequest assignCaregiver(Long requestId, Long caregiverId, String username) {
        ValueAddedServiceRequest request = requireRequest(requestId);
        cover.cover(dispatchedVisitId(request), caregiverId, identity.require(username).id());
        return managed(request, serviceName(request));
    }

    /**
     * Calls the request off. A dispatched request's visit is called off with it, so it leaves
     * the caregiver's schedule; once somebody has started on it, it is too late.
     */
    public ManagedRequest cancel(Long requestId, String username) {
        ValueAddedServiceRequest request = requireRequest(requestId);
        ValueAddedServiceRequest cancelled = request.cancelled();
        Optional<VisitReassignment.VisitSlot> visit = visit(request);
        if (visit.isPresent() && !"CANCELLED".equals(visit.get().status())) {
            if (!"SCHEDULED".equals(visit.get().status())) {
                throw new BusinessRuleViolation(
                        "VALUE_ADDED_VISIT_UNDER_WAY",
                        "The visit for this request is %s and can no longer be cancelled here."
                                .formatted(visit.get().status()));
            }
            visits.callOff(request.visitId(), new VisitReassignment.Change(
                    null, identity.require(username).id(), null, CANCEL_REASON));
        }
        return managed(requests.save(cancelled), serviceName(request));
    }

    /**
     * Brings every dispatched request into line with its visit: carried out means completed,
     * called off (for an absence, say) means cancelled.
     *
     * @return how many requests changed
     */
    public int settleWithVisits() {
        int settled = 0;
        for (ValueAddedServiceRequest request : requests.findByStatus(ValueAddedServiceRequest.Status.DISPATCHED)) {
            Optional<String> status = visit(request).map(VisitReassignment.VisitSlot::status);
            if (status.isEmpty()) {
                continue;
            }
            if (CARRIED_OUT.contains(status.get())) {
                requests.save(request.completed());
                settled++;
            }
            else if ("CANCELLED".equals(status.get())) {
                requests.save(request.cancelled());
                settled++;
            }
        }
        return settled;
    }

    private ManagedRequest managed(ValueAddedServiceRequest request, String serviceName) {
        Optional<VisitReassignment.VisitSlot> visit = visit(request);
        return new ManagedRequest(request, serviceName,
                visit.map(VisitReassignment.VisitSlot::status).orElse(null),
                visit.map(VisitReassignment.VisitSlot::caregiverId).orElse(null));
    }

    private Optional<VisitReassignment.VisitSlot> visit(ValueAddedServiceRequest request) {
        return request.visitId() == null ? Optional.empty() : visits.find(request.visitId());
    }

    private Long dispatchedVisitId(ValueAddedServiceRequest request) {
        if (request.status() != ValueAddedServiceRequest.Status.DISPATCHED || request.visitId() == null) {
            throw new BusinessRuleViolation(
                    "VALUE_ADDED_SERVICE_REQUEST_NOT_DISPATCHED",
                    "Only a dispatched value-added service request has a visit to staff.");
        }
        return request.visitId();
    }

    private String serviceName(ValueAddedServiceRequest request) {
        return services.findById(request.valueAddedServiceId()).map(ValueAddedService::name).orElse(null);
    }

    private ValueAddedServiceRequest requireRequest(Long id) {
        return requests.findById(id)
                .orElseThrow(() -> new ResourceNotFound("Value-added service request", id));
    }

    /**
     * A request as the manager sees it.
     *
     * @param visitStatus the work order's visit state, e.g. SCHEDULED; null before dispatch
     * @param caregiverId who is on the visit; null when nobody is yet
     */
    public record ManagedRequest(ValueAddedServiceRequest request, String serviceName, String visitStatus,
            Long caregiverId) {

        /** Dispatched, but its visit has nobody on it and has not started: the manager's to staff. */
        public boolean needsCaregiver() {
            return request.status() == ValueAddedServiceRequest.Status.DISPATCHED
                    && caregiverId == null && "SCHEDULED".equals(visitStatus);
        }
    }
}

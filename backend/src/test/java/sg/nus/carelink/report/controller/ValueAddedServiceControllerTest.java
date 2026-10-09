package sg.nus.carelink.report.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import sg.nus.carelink.identity.application.IdentityService;
import sg.nus.carelink.identity.domain.model.AppUser;
import sg.nus.carelink.report.application.ValueAddedServiceRequestService;
import sg.nus.carelink.report.controller.dto.ValueAddedServiceDecisionRequest;
import sg.nus.carelink.report.controller.dto.ValueAddedServiceRequestCreate;
import sg.nus.carelink.report.controller.dto.ValueAddedServiceRequestResponse;
import sg.nus.carelink.report.controller.dto.ValueAddedServiceResponse;
import sg.nus.carelink.report.domain.model.ValueAddedService;
import sg.nus.carelink.report.domain.model.ValueAddedServiceRequest;
import sg.nus.carelink.shared.security.Role;

class ValueAddedServiceControllerTest {

    private IdentityService identity;
    private ValueAddedServiceRequestService service;
    private ValueAddedServiceController controller;

    private Principal elderPrincipal;
    private Principal familyPrincipal;

    @BeforeEach
    void setUp() {
        identity = mock(IdentityService.class);
        service = mock(ValueAddedServiceRequestService.class);

        controller =
                new ValueAddedServiceController(
                        identity,
                        service
                );

        elderPrincipal =
                () -> "elder_test";

        familyPrincipal =
                () -> "family_test";

        when(identity.require("elder_test"))
                .thenReturn(
                        new AppUser(
                                1L,
                                "elder_test",
                                "Test Elder",
                                Set.of(Role.ELDER),
                                true
                        )
                );
    }

    @Test
    void returnsAvailableCatalogue() {
        when(service.availableServices())
                .thenReturn(
                        List.of(catalogue())
                );

        List<ValueAddedServiceResponse> result =
                controller.catalogue();

        assertThat(result)
                .hasSize(1);

        assertThat(result.get(0).id())
                .isEqualTo(2L);

        assertThat(result.get(0).name())
                .isEqualTo(
                        "Hospital escort"
                );
    }

    @Test
    void listsCurrentElderRequestsUsingAuthenticatedAccount() {
        when(service.listForElderUser(1L))
                .thenReturn(
                        List.of(pending())
                );

        when(service.requireService(2L))
                .thenReturn(catalogue());

        List<ValueAddedServiceRequestResponse> result =
                controller.elderRequests(
                        elderPrincipal
                );

        assertThat(result)
                .hasSize(1);

        assertThat(result.get(0).serviceName())
                .isEqualTo(
                        "Hospital escort"
                );

        assertThat(result.get(0).status())
                .isEqualTo(
                        ValueAddedServiceRequest.Status.PENDING_APPROVAL
                );

        verify(service)
                .listForElderUser(1L);
    }

    @Test
    void createsElderRequest() {
        ValueAddedServiceRequestCreate body =
                new ValueAddedServiceRequestCreate(
                        2L,
                        LocalDateTime.of(
                                2026,
                                10,
                                10,
                                10,
                                0
                        ),
                        "Need assistance"
                );

        when(
                service.requestForElderUser(
                        1L,
                        2L,
                        body.requestedSchedule(),
                        "Need assistance"
                )
        ).thenReturn(
                pending()
        );

        when(service.requireService(2L))
                .thenReturn(catalogue());

        ValueAddedServiceRequestResponse response =
                controller.create(
                        body,
                        elderPrincipal
                );

        assertThat(response.id())
                .isEqualTo(5L);

        assertThat(response.elderId())
                .isEqualTo(10L);

        assertThat(response.status())
                .isEqualTo(
                        ValueAddedServiceRequest.Status.PENDING_APPROVAL
                );
    }

    @Test
    void listsRequestsForFamilySelectedElder() {
        when(
                service.listForFamily(
                        "family_test",
                        10L
                )
        ).thenReturn(
                List.of(pending())
        );

        when(service.requireService(2L))
                .thenReturn(catalogue());

        List<ValueAddedServiceRequestResponse> response =
                controller.familyRequests(
                        10L,
                        familyPrincipal
                );

        assertThat(response)
                .hasSize(1);

        verify(service)
                .listForFamily(
                        "family_test",
                        10L
                );
    }

    @Test
    void familyApprovesRequest() {
        ValueAddedServiceRequest dispatched =
                new ValueAddedServiceRequest(
                        5L,
                        10L,
                        2L,
                        null,
                        20L,
                        77L,
                        LocalDateTime.of(
                                2026,
                                10,
                                10,
                                10,
                                0
                        ),
                        "Need assistance",
                        ValueAddedServiceRequest.Status.DISPATCHED,
                        LocalDateTime.of(
                                2026,
                                10,
                                7,
                                17,
                                0
                        ),
                        LocalDateTime.of(
                                2026,
                                10,
                                7,
                                12,
                                0
                        ),
                        LocalDateTime.of(
                                2026,
                                10,
                                7,
                                17,
                                0
                        )
                );

        when(
                service.decideForFamily(
                        "family_test",
                        5L,
                        ValueAddedServiceRequestService.Decision.APPROVED
                )
        ).thenReturn(dispatched);

        when(service.requireService(2L))
                .thenReturn(catalogue());

        ValueAddedServiceRequestResponse response =
                controller.decide(
                        5L,
                        new ValueAddedServiceDecisionRequest(
                                ValueAddedServiceRequestService.Decision.APPROVED
                        ),
                        familyPrincipal
                );

        assertThat(response.status())
                .isEqualTo(
                        ValueAddedServiceRequest.Status.DISPATCHED
                );

        assertThat(response.visitId())
                .isEqualTo(77L);
    }

    @Test
    void familyRejectsRequest() {
        ValueAddedServiceRequest rejected =
                pending().reject(
                        20L,
                        LocalDateTime.of(
                                2026,
                                10,
                                7,
                                17,
                                0
                        )
                );

        when(
                service.decideForFamily(
                        "family_test",
                        5L,
                        ValueAddedServiceRequestService.Decision.REJECTED
                )
        ).thenReturn(rejected);

        when(service.requireService(2L))
                .thenReturn(catalogue());

        ValueAddedServiceRequestResponse response =
                controller.decide(
                        5L,
                        new ValueAddedServiceDecisionRequest(
                                ValueAddedServiceRequestService.Decision.REJECTED
                        ),
                        familyPrincipal
                );

        assertThat(response.status())
                .isEqualTo(
                        ValueAddedServiceRequest.Status.REJECTED
                );

        assertThat(response.visitId())
                .isNull();
    }

    private ValueAddedService catalogue() {
        return new ValueAddedService(
                2L,
                "Hospital escort",
                "Escort to medical appointments",
                180,
                ValueAddedService.Status.AVAILABLE,
                null,
                null
        );
    }

    private ValueAddedServiceRequest pending() {
        return new ValueAddedServiceRequest(
                5L,
                10L,
                2L,
                null,
                null,
                null,
                LocalDateTime.of(
                        2026,
                        10,
                        10,
                        10,
                        0
                ),
                "Need assistance",
                ValueAddedServiceRequest.Status.PENDING_APPROVAL,
                null,
                LocalDateTime.of(
                        2026,
                        10,
                        7,
                        12,
                        0
                ),
                LocalDateTime.of(
                        2026,
                        10,
                        7,
                        12,
                        0
                )
        );
    }
}
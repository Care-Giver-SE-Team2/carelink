package sg.nus.carelink.profile.application;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sg.nus.carelink.identity.application.UserDirectory;
import sg.nus.carelink.profile.domain.model.Credential;
import sg.nus.carelink.profile.domain.repository.CaregiverRepository;
import sg.nus.carelink.profile.domain.repository.CredentialRepository;
import sg.nus.carelink.profile.domain.repository.CredentialTypeRepository;
import sg.nus.carelink.profile.domain.repository.ElderRepository;
import sg.nus.carelink.shared.error.ResourceNotFound;
import sg.nus.carelink.shared.security.Role;

@Service
@Transactional(readOnly = true)
class CaregiverWorkDirectoryService implements CaregiverWorkDirectory {
    private final UserDirectory users;
    private final CaregiverRepository caregivers;
    private final ElderRepository elders;
    private final CredentialRepository credentials;
    private final CredentialTypeRepository types;
    private final int warningDays;

    CaregiverWorkDirectoryService(UserDirectory users, CaregiverRepository caregivers, ElderRepository elders,
            CredentialRepository credentials, CredentialTypeRepository types,
            @Value("${carelink.caregiver.credential-warning-days:30}") int warningDays) {
        this.users = users;
        this.caregivers = caregivers;
        this.elders = elders;
        this.credentials = credentials;
        this.types = types;
        if (warningDays < 0) throw new IllegalArgumentException("Credential warning days must be non-negative");
        this.warningDays = warningDays;
    }

    public Profile require(String username) {
        var user = users.findByUsername(username)
                .filter(u -> u.enabled() && u.hasRole(Role.CAREGIVER))
                .orElseThrow(() -> new AccessDeniedException("A caregiver account is required"));
        var caregiver = caregivers.findByUserId(user.id())
                .orElseThrow(() -> new ResourceNotFound("Caregiver profile for user", user.id()));
        return new Profile(caregiver.id(), caregiver.userId(), caregiver.fullName(), caregiver.phone(),
                caregiver.sector(), caregiver.dialects(), caregiver.status().name());
    }

    public ElderView elder(Long elderId) {
        var elder = elders.findById(elderId).orElseThrow(() -> new ResourceNotFound("Elder", elderId));
        var dialects = elder.preferredDialects() == null ? List.<String>of()
                : Arrays.stream(elder.preferredDialects().split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
        // No dedicated access/emergency notes exist: never substitute unrestricted medicalNotes.
        return new ElderView(elder.id(), elder.fullName(), elder.address(), elder.sector(), dialects, null, null);
    }

    public List<CredentialAlert> alerts(Long caregiverId, LocalDate today) {
        var eligible = Set.of(Credential.Status.PUBLISHED, Credential.Status.EXPIRING, Credential.Status.EXPIRED);
        return credentials.findByCaregiverId(caregiverId).stream()
                .filter(c -> eligible.contains(c.status()) && c.expiryDate() != null)
                .filter(c -> !c.expiryDate().isAfter(today.plusDays(warningDays)))
                // The shared repository retains the family-facing type/id order.
                .sorted(Comparator.comparing(Credential::expiryDate).thenComparing(Credential::id))
                .map(c -> new CredentialAlert(c.id(),
                        types.findById(c.credentialTypeId()).map(t -> t.name()).orElse("Credential"),
                        c.certificateNo(), c.expiryDate(), c.status().name(),
                        c.expiryDate().isBefore(today) ? "EXPIRED" : "EXPIRING"))
                .toList();
    }
}

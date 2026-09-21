package sg.nus.carelink.profile.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.profile.domain.model.Elder;
import sg.nus.carelink.shared.error.ResourceNotFound;

class ProfileServiceTest {

    private final InMemoryElderRepository repository =
            new InMemoryElderRepository();

    private final ProfileService service =
            new ProfileService(repository);

    @Test
    void findsWhatWasSaved() {
        Elder saved = saveElder(2L);

        assertThat(service.findElder(saved.id()))
                .contains(saved);
    }

    @Test
    void isEmptyForAnUnknownId() {
        assertThat(service.findElder(999L))
                .isEmpty();
    }

    @Test
    void findsElderByLinkedUserId() {
        Elder saved = saveElder(7L);

        Elder found =
                service.requireElderByUserId(7L);

        assertThat(found)
                .isEqualTo(saved);

        assertThat(found.userId())
                .isEqualTo(7L);
    }

    @Test
    void throwsWhenNoElderIsLinkedToUser() {
        assertThatThrownBy(
                () -> service.requireElderByUserId(999L)
        )
                .isInstanceOf(ResourceNotFound.class)
                .hasMessageContaining("Elder for user")
                .hasMessageContaining("999");
    }

    private Elder saveElder(Long userId) {
        return repository.save(
                new Elder(
                        null,
                        userId,
                        "v3",
                        Elder.Gender.MALE,
                        LocalDate.of(2026, 9, 6),
                        "v6",
                        "v7",
                        "v8",
                        "v9",
                        "v10",
                        Boolean.TRUE,
                        Elder.MobilityLevel.INDEPENDENT,
                        Elder.ContinuityPreference.PREFERRED,
                        "v14",
                        LocalDateTime.of(
                                2026,
                                9,
                                6,
                                10,
                                15
                        ),
                        LocalDateTime.of(
                                2026,
                                9,
                                6,
                                10,
                                16
                        )
                )
        );
    }
}
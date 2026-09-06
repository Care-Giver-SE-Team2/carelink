package sg.nus.carelink.profile.infrastructure.persistence.adapter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.profile.domain.model.CredentialType;
import sg.nus.carelink.profile.infrastructure.persistence.entity.CredentialTypeJpaEntity;
import sg.nus.carelink.profile.infrastructure.persistence.repository.CredentialTypeJpaRepository;

/** The adapter delegates to Spring Data and maps at the boundary; nothing else. */
class CredentialTypeRepositoryAdapterTest {

	private final CredentialTypeJpaRepository jpa = mock(CredentialTypeJpaRepository.class);
	private final CredentialTypeRepositoryAdapter adapter = new CredentialTypeRepositoryAdapter(jpa);

	@Test
	void findByIdMapsTheEntityToTheDomainModel() {
		CredentialTypeJpaEntity entity = new CredentialTypeJpaEntity();
		entity.setId(7L);
		when(jpa.findById(7L)).thenReturn(Optional.of(entity));

		Optional<CredentialType> found = adapter.findById(7L);

		assertThat(found).isPresent();
		assertThat(found.get().id()).isEqualTo(7L);
	}

	@Test
	void findByIdIsEmptyWhenThereIsNoRow() {
		when(jpa.findById(any())).thenReturn(Optional.empty());

		assertThat(adapter.findById(7L)).isEmpty();
	}

	@Test
	void saveGoesThroughSpringDataAndComesBackAsDomain() {
		CredentialTypeJpaEntity entity = new CredentialTypeJpaEntity();
		entity.setId(7L);
		when(jpa.save(any(CredentialTypeJpaEntity.class))).thenReturn(entity);

		CredentialType saved = adapter.save(CredentialTypeMapper.toDomain(entity));

		assertThat(saved).isNotNull();
	}
}

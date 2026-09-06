package sg.nus.carelink.incident.infrastructure.persistence.adapter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.incident.domain.model.SpotCheck;
import sg.nus.carelink.incident.infrastructure.persistence.entity.SpotCheckJpaEntity;
import sg.nus.carelink.incident.infrastructure.persistence.repository.SpotCheckJpaRepository;

/** The adapter delegates to Spring Data and maps at the boundary; nothing else. */
class SpotCheckRepositoryAdapterTest {

	private final SpotCheckJpaRepository jpa = mock(SpotCheckJpaRepository.class);
	private final SpotCheckRepositoryAdapter adapter = new SpotCheckRepositoryAdapter(jpa);

	@Test
	void findByIdMapsTheEntityToTheDomainModel() {
		SpotCheckJpaEntity entity = new SpotCheckJpaEntity();
		entity.setId(7L);
		when(jpa.findById(7L)).thenReturn(Optional.of(entity));

		Optional<SpotCheck> found = adapter.findById(7L);

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
		SpotCheckJpaEntity entity = new SpotCheckJpaEntity();
		entity.setId(7L);
		when(jpa.save(any(SpotCheckJpaEntity.class))).thenReturn(entity);

		SpotCheck saved = adapter.save(SpotCheckMapper.toDomain(entity));

		assertThat(saved).isNotNull();
	}
}
